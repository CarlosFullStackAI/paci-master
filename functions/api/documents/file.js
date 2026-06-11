import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';

// GET /api/documents/file?id=<documentId>
// Sirve el archivo subido de un documento (KV PACI_FILES), verificando que el
// documento pertenezca al establecimiento del usuario. Auth via cookie
// (el link se abre same-origin desde el dashboard).

export async function onRequestGet(context) {
  const { request, env } = context;
  const jsonHeaders = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers: jsonHeaders });

    const url = new URL(request.url);
    const documentId = parseInt(url.searchParams.get('id'), 10);
    if (!documentId) return new Response(JSON.stringify({ ok: false, error: 'id requerido.' }), { status: 400, headers: jsonHeaders });

    const tenant = await resolveTenant(request, env, user);
    if (!tenant) return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers: jsonHeaders });

    const doc = await env.DB.prepare(
      'SELECT id, file_key, file_name, file_mime FROM documents WHERE id = ? AND tenant_id = ?'
    ).bind(documentId, tenant.id).first();

    if (!doc || !doc.file_key) {
      return new Response(JSON.stringify({ ok: false, error: 'Archivo no encontrado.' }), { status: 404, headers: jsonHeaders });
    }

    const buffer = await env.PACI_FILES.get(doc.file_key, { type: 'arrayBuffer' });
    if (!buffer) {
      return new Response(JSON.stringify({ ok: false, error: 'Archivo no encontrado.' }), { status: 404, headers: jsonHeaders });
    }

    const safeName = (doc.file_name || 'documento').replace(/"/g, '');
    return new Response(buffer, {
      headers: {
        'Content-Type': doc.file_mime || 'application/octet-stream',
        'Content-Disposition': 'inline; filename="' + safeName + '"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (e) {
    console.error('Error en documents/file:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Error al obtener el archivo.' }), { status: 500, headers: jsonHeaders });
  }
}
