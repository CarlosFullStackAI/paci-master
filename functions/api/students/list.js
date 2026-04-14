import { getUser } from '../auth-helper.js';
import { decryptStudentFields } from '../crypto-helper.js';
import { logAudit, getUserRole } from '../audit-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const students = await env.DB.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM documents d WHERE d.student_id = s.id) as doc_count,
        (SELECT COUNT(DISTINCT oa_code || '-' || subject_key || '-' || level) FROM document_oas WHERE student_id = s.id) as unique_oas_count,
        (SELECT MAX(d.created_at) FROM documents d WHERE d.student_id = s.id) as last_doc_date
      FROM students s
      WHERE s.user_email = ?
      ORDER BY s.updated_at DESC
    `).bind(user.email).all();

    // Descifrar y devolver datos completos (son SUS estudiantes)
    const decrypted = await Promise.all(
      (students.results || []).map(s => decryptStudentFields(s, env.ENCRYPTION_KEY))
    );

    // Audit: listar estudiantes
    await logAudit(env, request, user, 'LIST_STUDENTS', 'students', 0,
      `Listed ${decrypted.length} students`);

    const role = await getUserRole(env, user.email);

    return new Response(JSON.stringify({
      ok: true,
      students: decrypted,
      role
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
