import { getUser } from '../auth-helper.js';
import { checkPermission } from '../rbac-helper.js';
import { logAudit } from '../audit-helper.js';

// POST /api/students/oa-progress
// Actualizar progreso de un OA especifico
// { oaId, status, observations }
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    // Solo roles con permiso de edicion pueden evaluar
    const denied = checkPermission(user.role, 'paci:edit');
    if (denied) return denied;

    const body = await request.json();
    const { oaId, status, observations } = body;

    if (!oaId) {
      return new Response(JSON.stringify({ ok: false, error: 'oaId requerido.' }), { status: 400, headers });
    }

    const VALID_STATUS = ['logrado', 'en_desarrollo', 'no_logrado', 'no_evaluado'];
    if (status && !VALID_STATUS.includes(status)) {
      return new Response(JSON.stringify({ ok: false, error: 'Estado invalido. Usa: ' + VALID_STATUS.join(', ') }), { status: 400, headers });
    }

    // Verificar que el OA existe y pertenece a un documento del usuario (o el usuario tiene permisos globales)
    const oa = await env.DB.prepare(
      `SELECT do.id, do.document_id, d.user_email
       FROM document_oas do
       JOIN documents d ON do.document_id = d.id
       WHERE do.id = ?`
    ).bind(oaId).first();

    if (!oa) {
      return new Response(JSON.stringify({ ok: false, error: 'OA no encontrado.' }), { status: 404, headers });
    }

    // Verificar propiedad (excepto admin/utp que ven todo)
    const role = user.role || 'teacher';
    if (!['admin', 'utp', 'coordinator'].includes(role) && oa.user_email !== user.email) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes acceso a este OA.' }), { status: 403, headers });
    }

    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE document_oas SET progress_status = ?, progress_observations = ?, evaluated_at = ?, evaluated_by = ?
       WHERE id = ?`
    ).bind(
      status || 'no_evaluado',
      observations || '',
      now,
      user.email,
      oaId
    ).run();

    await logAudit(env, request, user, 'oa_progress_update', 'document_oas', oaId, `Estado: ${status}`);

    return new Response(JSON.stringify({
      ok: true,
      message: 'Progreso actualizado.',
      oaId,
      status: status || 'no_evaluado'
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error: ' + e.message }), { status: 500, headers });
  }
}
