import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    // Aislamiento por establecimiento: se ven TODOS los documentos del colegio
    // (equipo PIE colaborativo). El rol ya no acota el alcance de lectura.
    const tenant = await resolveTenant(request, env, user);
    if (!tenant) return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers });
    const tenantId = tenant.id;

    const body = await request.json();
    const studentId = body.studentId;
    const role = user.role || 'teacher';

    let docs;
    if (studentId) {
      docs = await env.DB.prepare(
        `SELECT d.*, d.approval_status, d.approved_by, d.approved_at,
                s.name as student_name, s.diagnosis, s.work_level as student_work_level
         FROM documents d JOIN students s ON d.student_id = s.id
         WHERE d.tenant_id = ? AND d.student_id = ?
         ORDER BY d.created_at DESC`
      ).bind(tenantId, studentId).all();
    } else {
      docs = await env.DB.prepare(
        `SELECT d.*, d.approval_status, d.approved_by, d.approved_at,
                s.name as student_name, s.diagnosis, s.work_level as student_work_level
         FROM documents d JOIN students s ON d.student_id = s.id
         WHERE d.tenant_id = ?
         ORDER BY d.created_at DESC`
      ).bind(tenantId).all();
    }

    return new Response(JSON.stringify({
      ok: true,
      documents: docs.results || [],
      userRole: role
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
