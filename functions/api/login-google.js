// Login via Google Sign-In (Google Identity Services).
// El frontend obtiene un ID token (JWT) de Google y lo POSTea aqui.
// Validamos el JWT con las public keys de Google (sin librerias externas) y
// creamos sesion en KV. Si el usuario es nuevo, se crea con role='teacher'.
//
// Comportamiento:
//   - Misma logica que el registro tradicional: cualquier email Google es valido.
//   - Si el email ya existe (registrado con password antes), se vincula y se loguea.
//   - Default role para nuevo usuario Google: 'teacher'.

export async function onRequest(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Solo POST' }), { status: 405, headers });
  }

  if (!env.GOOGLE_CLIENT_ID) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Google Sign-In no configurado en el servidor (falta GOOGLE_CLIENT_ID).'
    }), { status: 503, headers });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ ok: false, error: 'Body invalido' }), { status: 400, headers }); }

  const credential = body && body.credential;
  if (!credential || typeof credential !== 'string') {
    return new Response(JSON.stringify({ ok: false, error: 'Credential requerido' }), { status: 400, headers });
  }

  // 1. Validar el JWT de Google
  let payload;
  try {
    payload = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID);
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Token de Google invalido: ' + (e.message || 'unknown')
    }), { status: 401, headers });
  }

  const email = (payload.email || '').toLowerCase().trim();
  const name = payload.name || payload.given_name || email.split('@')[0];
  const emailVerified = payload.email_verified === true;

  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: 'Token sin email' }), { status: 400, headers });
  }

  if (!emailVerified) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Tu cuenta de Google no tiene email verificado.'
    }), { status: 403, headers });
  }

  // 2. Buscar/crear usuario en KV
  const userKey = `user:${email}`;
  const existing = await env.PACI_USERS.get(userKey);
  let userObj;

  if (existing) {
    userObj = JSON.parse(existing);
    // Vincular Google si no estaba vinculado
    if (!userObj.googleSub) {
      userObj.googleSub = payload.sub;
      userObj.googleLinkedAt = new Date().toISOString();
      await env.PACI_USERS.put(userKey, JSON.stringify(userObj));
    }
  } else {
    // Crear usuario nuevo con default role='teacher'
    userObj = {
      name,
      email,
      role: 'teacher',
      authProvider: 'google',
      googleSub: payload.sub,
      googlePicture: payload.picture || null,
      createdAt: new Date().toISOString()
    };
    await env.PACI_USERS.put(userKey, JSON.stringify(userObj));
  }

  // 3. Crear sesion (mismo formato que login tradicional)
  const token = crypto.randomUUID();
  const sessionData = {
    email,
    name: userObj.name,
    role: userObj.role || 'teacher',
    authProvider: 'google',
    createdAt: new Date().toISOString()
  };
  // TTL 7 dias
  await env.PACI_USERS.put(`session:${token}`, JSON.stringify(sessionData), { expirationTtl: 7 * 24 * 3600 });

  // 4. Cookie httpOnly y JSON con el token (mismo patron que login tradicional)
  const respHeaders = new Headers(headers);
  respHeaders.append('Set-Cookie', `paci_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 3600}`);

  return new Response(JSON.stringify({
    ok: true,
    token,
    user: { email, name: userObj.name, role: userObj.role }
  }), { status: 200, headers: respHeaders });
}

// ===== Validacion del JWT de Google con Web Crypto API (sin librerias) =====

async function verifyGoogleIdToken(idToken, expectedClientId) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('JWT mal formado');

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decodificar header y payload
  const header = JSON.parse(b64UrlDecodeString(headerB64));
  const payload = JSON.parse(b64UrlDecodeString(payloadB64));

  // Validar claims
  if (payload.aud !== expectedClientId) {
    throw new Error('audience no coincide con GOOGLE_CLIENT_ID');
  }
  const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    throw new Error('issuer invalido');
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('token expirado');
  if (payload.iat > now + 300) throw new Error('token con iat futuro');

  // Obtener public keys de Google (cacheable: max-age en sus headers)
  const jwksRes = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!jwksRes.ok) throw new Error('No se pudo obtener public keys de Google');
  const jwks = await jwksRes.json();

  const key = (jwks.keys || []).find(k => k.kid === header.kid && k.alg === header.alg);
  if (!key) throw new Error('Public key no encontrada para kid ' + header.kid);

  // Importar la public key
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Verificar firma
  const signedData = new TextEncoder().encode(headerB64 + '.' + payloadB64);
  const signatureBytes = b64UrlDecodeBytes(signatureB64);

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    signedData
  );

  if (!valid) throw new Error('Firma del JWT invalida');

  return payload;
}

function b64UrlDecodeString(s) {
  return new TextDecoder().decode(b64UrlDecodeBytes(s));
}

function b64UrlDecodeBytes(s) {
  let normalized = s.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  const binary = atob(normalized);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
