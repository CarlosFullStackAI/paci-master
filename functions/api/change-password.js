export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    // Obtener token de cookie o body
    const cookieStr = request.headers.get('Cookie') || '';
    let token = getCookieValue(cookieStr, 'paci_session');
    const body = await request.json();
    if (!token) token = body._token;
    if (!token) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const sessionData = await env.PACI_USERS.get(`session:${token}`);
    if (!sessionData) return new Response(JSON.stringify({ ok: false, error: 'Sesion expirada.' }), { status: 401, headers });
    const session = JSON.parse(sessionData);

    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ ok: false, error: 'Ambas contrasenas son requeridas.' }), { status: 400, headers });
    }
    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ ok: false, error: 'La nueva contrasena debe tener al menos 8 caracteres.' }), { status: 400, headers });
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return new Response(JSON.stringify({ ok: false, error: 'Debe incluir al menos 1 mayuscula y 1 numero.' }), { status: 400, headers });
    }

    // Verificar contrasena actual
    const userData = await env.PACI_USERS.get(`user:${session.email}`);
    if (!userData) return new Response(JSON.stringify({ ok: false, error: 'Usuario no encontrado.' }), { status: 404, headers });
    const user = JSON.parse(userData);

    const currentHash = await hashPasswordPBKDF2(currentPassword, user.salt);
    if (currentHash !== user.passwordHash) {
      return new Response(JSON.stringify({ ok: false, error: 'Contrasena actual incorrecta.' }), { status: 401, headers });
    }

    // Generar nuevo hash
    const newSalt = crypto.randomUUID();
    const newHash = await hashPasswordPBKDF2(newPassword, newSalt);

    user.passwordHash = newHash;
    user.salt = newSalt;
    await env.PACI_USERS.put(`user:${session.email}`, JSON.stringify(user));

    return new Response(JSON.stringify({ ok: true, message: 'Contrasena actualizada.' }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}

function getCookieValue(cookieStr, name) {
  const match = cookieStr.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? match[1] : null;
}

async function hashPasswordPBKDF2(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
}
