import { getUser } from '../auth-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const { documentId } = await request.json();
    if (!documentId) return new Response(JSON.stringify({ ok: false, error: 'ID requerido.' }), { status: 400, headers });

    // Verificar que el documento pertenece al usuario
    const doc = await env.DB.prepare(
      'SELECT id FROM documents WHERE id = ? AND user_email = ?'
    ).bind(documentId, user.email).first();

    if (!doc) return new Response(JSON.stringify({ ok: false, error: 'Documento no encontrado.' }), { status: 404, headers });

    // Eliminar OAs asociados y luego el documento
    await env.DB.batch([
      env.DB.prepare('DELETE FROM document_oas WHERE document_id = ?').bind(documentId),
      env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(documentId)
    ]);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
