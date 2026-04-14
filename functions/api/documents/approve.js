import { getUser } from '../auth-helper.js';
import { checkPermission } from '../rbac-helper.js';
import { logAudit } from '../audit-helper.js';

// POST /api/documents/approve
// { documentId, action: 'approve' | 'reject' }
// Solo roles utp y admin pueden aprobar/rechazar
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    // Verificar permiso de aprobacion
    const denied = checkPermission(user.role, 'paci:approve');
    if (denied) return denied;

    const body = await request.json();
    const { documentId, action } = body;

    if (!documentId || !action) {
      return new Response(JSON.stringify({ ok: false, error: 'documentId y action requeridos.' }), { status: 400, headers });
    }

    if (action !== 'approve' && action !== 'reject') {
      return new Response(JSON.stringify({ ok: false, error: 'Accion invalida. Usa "approve" o "reject".' }), { status: 400, headers });
    }

    // Verificar que el documento existe
    const doc = await env.DB.prepare(
      'SELECT id, approval_status FROM documents WHERE id = ?'
    ).bind(documentId).first();

    if (!doc) {
      return new Response(JSON.stringify({ ok: false, error: 'Documento no encontrado.' }), { status: 404, headers });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE documents SET approval_status = ?, approved_by = ?, approved_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(newStatus, user.email, now, documentId).run();

    await logAudit(env, request, user, `document_${action}`, 'document', documentId, `Estado: ${newStatus}`);

    const statusMsg = action === 'approve' ? 'aprobado' : 'rechazado';
    return new Response(JSON.stringify({
      ok: true,
      message: `Documento ${statusMsg} exitosamente.`,
      status: newStatus,
      approvedBy: user.email,
      approvedAt: now
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error al procesar aprobacion: ' + e.message }), { status: 500, headers });
  }
}
