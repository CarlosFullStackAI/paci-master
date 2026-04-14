import { getUser } from '../auth-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const body = await request.json();
    const studentId = body.studentId;

    let docs;
    if (studentId) {
      docs = await env.DB.prepare(
        `SELECT d.*, s.name as student_name, s.diagnosis, s.work_level as student_work_level
         FROM documents d JOIN students s ON d.student_id = s.id
         WHERE d.user_email = ? AND d.student_id = ?
         ORDER BY d.created_at DESC`
      ).bind(user.email, studentId).all();
    } else {
      docs = await env.DB.prepare(
        `SELECT d.*, s.name as student_name, s.diagnosis, s.work_level as student_work_level
         FROM documents d JOIN students s ON d.student_id = s.id
         WHERE d.user_email = ?
         ORDER BY d.created_at DESC`
      ).bind(user.email).all();
    }

    return new Response(JSON.stringify({
      ok: true,
      documents: docs.results || []
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
