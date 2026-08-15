// Actualiza datos profesionales del usuario (RUT, Registro MINEDUC, genero) en KV.
// GET: lee los datos actuales. POST: los actualiza.
// genero ('hombre'/'mujer') define el trato en la redaccion de documentos:
// "el docente" / "la docente" (clases IA, Intervencion NEEP, titulos de firma).
import { getUser } from '../auth-helper.js';

export async function onRequest(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const raw = await env.PACI_USERS.get(`user:${user.email}`);
    if (!raw) return new Response(JSON.stringify({ ok: false, error: 'Perfil no encontrado.' }), { status: 404, headers });
    const userObj = JSON.parse(raw);

    if (request.method === 'GET') {
      return new Response(JSON.stringify({
        ok: true,
        profile: {
          name: userObj.name || '',
          email: userObj.email || user.email,
          role: userObj.role || 'teacher',
          rut: userObj.rut || '',
          registroMineduc: userObj.registroMineduc || '',
          genero: userObj.genero || ''
        }
      }), { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      // Solo aceptamos estos 3 campos por seguridad.
      const rut = sanitizeRut(body.rut);
      const registroMineduc = sanitizeRegistro(body.registroMineduc);
      const genero = sanitizeGenero(body.genero);
      userObj.rut = rut;
      userObj.registroMineduc = registroMineduc;
      userObj.genero = genero;
      userObj.updatedAt = new Date().toISOString();
      await env.PACI_USERS.put(`user:${user.email}`, JSON.stringify(userObj));
      return new Response(JSON.stringify({ ok: true, profile: {
        rut: userObj.rut,
        registroMineduc: userObj.registroMineduc,
        genero: userObj.genero
      } }), { headers });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Metodo no permitido.' }), { status: 405, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno.' }), { status: 500, headers });
  }
}

function sanitizeRut(s) {
  return String(s || '').slice(0, 20).replace(/[^\d\.\-kK]/g, '').trim();
}
function sanitizeRegistro(s) {
  return String(s || '').slice(0, 60).replace(/[^A-Za-z0-9\-\.\/ ]/g, '').trim();
}
function sanitizeGenero(s) {
  const v = String(s || '').toLowerCase().trim();
  return (v === 'hombre' || v === 'mujer') ? v : '';
}
