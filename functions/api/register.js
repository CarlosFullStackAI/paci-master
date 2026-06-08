import { getSubdomainSlug } from './tenant-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const { name, email, password, tenantSlug, joinCode } = await request.json();

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Todos los campos son obligatorios.' }), { status: 400, headers });
    }

    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'Formato de correo invalido.' }), { status: 400, headers });
    }

    // Password minimo 8 caracteres con al menos 1 numero y 1 mayuscula
    if (password.length < 8) {
      return new Response(JSON.stringify({ ok: false, error: 'La contrasena debe tener al menos 8 caracteres.' }), { status: 400, headers });
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return new Response(JSON.stringify({ ok: false, error: 'La contrasena debe incluir al menos 1 mayuscula y 1 numero.' }), { status: 400, headers });
    }

    // Rate limiting: max 5 registros por IP en 15 minutos
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rlKey = `rl:register:${clientIP}`;
    const rlCount = parseInt(await env.PACI_USERS.get(rlKey) || '0');
    if (rlCount >= 5) {
      return new Response(JSON.stringify({ ok: false, error: 'Demasiados intentos. Espera 15 minutos.' }), { status: 429, headers });
    }
    await env.PACI_USERS.put(rlKey, String(rlCount + 1), { expirationTtl: 900 });

    // Establecimiento: lo elige el usuario al registrarse. Si no llega en el body,
    // intentamos resolverlo por subdominio (cuando hay dominio propio configurado).
    const chosenSlug = (tenantSlug || getSubdomainSlug(request) || '').trim();
    if (!chosenSlug) {
      return new Response(JSON.stringify({ ok: false, error: 'Selecciona tu establecimiento.' }), { status: 400, headers });
    }
    const tenant = await env.DB.prepare(
      'SELECT slug, join_code FROM tenants WHERE slug = ? AND activo = 1'
    ).bind(chosenSlug).first();
    if (!tenant) {
      return new Response(JSON.stringify({ ok: false, error: 'El establecimiento seleccionado no es valido.' }), { status: 400, headers });
    }
    // Codigo de union: cierra el registro abierto. Debe coincidir con el del colegio.
    const code = String(joinCode || '').trim();
    if (!tenant.join_code || code !== tenant.join_code) {
      return new Response(JSON.stringify({ ok: false, error: 'Codigo de colegio invalido. Pidelo al administrador de tu establecimiento.' }), { status: 400, headers });
    }

    // Verificar si el usuario ya existe
    const existing = await env.PACI_USERS.get(`user:${email}`);
    if (existing) {
      return new Response(JSON.stringify({ ok: false, error: 'Este correo ya esta registrado.' }), { status: 409, headers });
    }

    // Hashear password con PBKDF2 (100,000 iteraciones)
    const salt = crypto.randomUUID();
    const hash = await hashPasswordPBKDF2(password, salt);

    const role = 'teacher';

    // Guardar usuario en KV (incluye su establecimiento)
    await env.PACI_USERS.put(`user:${email}`, JSON.stringify({
      name,
      email,
      passwordHash: hash,
      salt,
      role,
      tenantSlug: tenant.slug,
      createdAt: new Date().toISOString()
    }));

    // Crear sesion (auto-login tras registrarse), incluyendo el establecimiento.
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    await env.PACI_USERS.put(`session:${token}`, JSON.stringify({
      email,
      name,
      role,
      tenantSlug: tenant.slug
    }), { expirationTtl: 86400 });

    const secure = new URL(request.url).protocol === 'https:' ? ' Secure;' : '';
    const cookieHeader = `paci_session=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=86400`;

    return new Response(JSON.stringify({
      ok: true,
      token,
      email,
      name,
      role,
      tenantSlug: tenant.slug
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieHeader }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}

async function hashPasswordPBKDF2(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
}
