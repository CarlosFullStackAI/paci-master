import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const { documentId } = await request.json();
    if (!documentId) return new Response(JSON.stringify({ ok: false, error: 'ID requerido.' }), { status: 400, headers });

    const tenant = await resolveTenant(request, env, user);
    if (!tenant) return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers });
    const tenantId = tenant.id;

    // Verificar que el documento pertenece al establecimiento del usuario
    const doc = await env.DB.prepare(
      'SELECT id, file_key FROM documents WHERE id = ? AND tenant_id = ?'
    ).bind(documentId, tenantId).first();

    if (!doc) return new Response(JSON.stringify({ ok: false, error: 'Documento no encontrado.' }), { status: 404, headers });

    // Si era un archivo subido, eliminar tambien el binario de KV.
    if (doc.file_key && env.PACI_FILES) {
      await env.PACI_FILES.delete(doc.file_key).catch(() => {});
    }

    // Si este documento es un plan anual padre, sus trimestres hijos quedarian
    // apuntando a un padre inexistente. Para NO perder datos, los desvinculamos
    // (parent_id = NULL): los trimestres sobreviven como documentos independientes.
    // Luego eliminamos los OAs del documento y el documento mismo.
    await env.DB.batch([
      env.DB.prepare('UPDATE documents SET parent_id = NULL WHERE parent_id = ? AND tenant_id = ?').bind(documentId, tenantId),
      env.DB.prepare('DELETE FROM document_oas WHERE document_id = ?').bind(documentId),
      env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(documentId)
    ]);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
