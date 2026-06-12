import { getUser } from '../auth-helper.js';

// Foto de perfil del docente. Se guarda en el KV de archivos (PACI_FILES) bajo
// la clave photo:<email> y la puede ver cualquier usuario autenticado del sistema.
//   GET  /api/users/photo?email=...   -> sirve la imagen (para <img src>)
//   POST /api/users/photo { photo }   -> guarda la foto del usuario conectado
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB ya decodificada

export async function onRequestGet(context) {
  const { request, env } = context;

  // Cualquier usuario con sesion valida puede ver la foto de un colega.
  const user = await getUser(request, env);
  if (!user) return new Response('No autorizado', { status: 401 });

  const email = (new URL(request.url).searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return new Response('email requerido', { status: 400 });

  const raw = await env.PACI_FILES.get(`photo:${email}`);
  if (!raw) return new Response('Sin foto', { status: 404 });

  let stored;
  try { stored = JSON.parse(raw); } catch (e) { return new Response('Sin foto', { status: 404 }); }

  const mime = ALLOWED_MIME.has(stored.mime) ? stored.mime : 'image/jpeg';
  const bytes = Uint8Array.from(atob(stored.data), c => c.charCodeAt(0));

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'private, max-age=60',
      'Content-Length': String(bytes.length)
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const body = await request.json();
    const dataUrl = String(body.photo || '');

    // Solo data URLs de imagen en base64; rechaza cualquier otro contenido.
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!m) return new Response(JSON.stringify({ ok: false, error: 'Formato de imagen inválido. Usa JPG, PNG, WEBP o GIF.' }), { status: 400, headers });

    const mime = m[1];
    const b64 = m[2];
    const approxBytes = Math.floor(b64.length * 3 / 4);
    if (approxBytes > MAX_BYTES) {
      return new Response(JSON.stringify({ ok: false, error: 'La imagen es muy grande (máximo 2 MB).' }), { status: 400, headers });
    }

    const email = user.email;
    await env.PACI_FILES.put(`photo:${email}`, JSON.stringify({ mime, data: b64 }));

    // Marca de version en el perfil: sirve para refrescar la cache del <img>.
    const userRaw = await env.PACI_USERS.get(`user:${email}`);
    const version = new Date().toISOString();
    if (userRaw) {
      const u = JSON.parse(userRaw);
      u.photoVersion = version;
      await env.PACI_USERS.put(`user:${email}`, JSON.stringify(u));
    }

    return new Response(JSON.stringify({ ok: true, photoVersion: version }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
