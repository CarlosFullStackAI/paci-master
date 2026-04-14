export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Completa todos los campos.' }), { status: 400, headers });
    }

    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'Formato de correo invalido.' }), { status: 400, headers });
    }

    // Rate limiting: max 5 intentos por IP en 15 minutos
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rlKey = `rl:login:${clientIP}`;
    const rlCount = parseInt(await env.PACI_USERS.get(rlKey) || '0');
    if (rlCount >= 5) {
      return new Response(JSON.stringify({ ok: false, error: 'Demasiados intentos. Espera 15 minutos.' }), { status: 429, headers });
    }

    // Buscar usuario en KV
    const userData = await env.PACI_USERS.get(`user:${email}`);
    if (!userData) {
      await env.PACI_USERS.put(rlKey, String(rlCount + 1), { expirationTtl: 900 });
      return new Response(JSON.stringify({ ok: false, error: 'Correo o contrasena incorrectos.' }), { status: 401, headers });
    }

    const user = JSON.parse(userData);

    // Verificar password con PBKDF2 (comparacion en tiempo constante para evitar timing attacks)
    const hash = await hashPasswordPBKDF2(password, user.salt);
    const hashBytes = new TextEncoder().encode(hash);
    const storedBytes = new TextEncoder().encode(user.passwordHash);
    const isMatch = hashBytes.length === storedBytes.length &&
      crypto.subtle.timingSafeEqual ? await timingSafeCompare(hashBytes, storedBytes) :
      hash === user.passwordHash;
    if (!isMatch) {
      await env.PACI_USERS.put(rlKey, String(rlCount + 1), { expirationTtl: 900 });
      return new Response(JSON.stringify({ ok: false, error: 'Correo o contrasena incorrectos.' }), { status: 401, headers });
    }

    // Login exitoso: resetear rate limit
    await env.PACI_USERS.delete(rlKey);

    // Crear token de sesion
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();

    // Obtener rol del usuario (default: teacher)
    const userRole = user.role || 'teacher';

    // Guardar sesion en KV (expira en 24 horas) - incluye rol
    await env.PACI_USERS.put(`session:${token}`, JSON.stringify({
      email: user.email,
      name: user.name,
      role: userRole
    }), { expirationTtl: 86400 });

    // Configurar httpOnly cookie (no accesible desde JS = inmune a XSS)
    const cookieHeader = `paci_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`;

    return new Response(JSON.stringify({
      ok: true,
      token,
      email: user.email,
      name: user.name,
      role: userRole
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}

// Comparacion en tiempo constante (evita timing attacks)
function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
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
