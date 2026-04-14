import { getUser } from '../auth-helper.js';
import { logAudit } from '../audit-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const { studentId } = await request.json();
    if (!studentId) return new Response(JSON.stringify({ ok: false, error: 'studentId requerido.' }), { status: 400, headers });

    // Verificar que el estudiante pertenece al usuario
    const student = await env.DB.prepare(
      'SELECT id, name FROM students WHERE id = ? AND user_email = ?'
    ).bind(studentId, user.email).first();

    if (!student) return new Response(JSON.stringify({ ok: false, error: 'Estudiante no encontrado.' }), { status: 404, headers });

    // Eliminar en cascada: OAs → documentos → estudiante
    await env.DB.batch([
      env.DB.prepare('DELETE FROM document_oas WHERE student_id = ?').bind(studentId),
      env.DB.prepare('DELETE FROM documents WHERE student_id = ?').bind(studentId),
      env.DB.prepare('DELETE FROM students WHERE id = ?').bind(studentId)
    ]);

    // Audit log
    await logAudit(env, request, user, 'DELETE_STUDENT', 'students', studentId,
      'Student deleted (name redacted)');

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
