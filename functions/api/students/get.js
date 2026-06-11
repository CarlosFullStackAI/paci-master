import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';
import { decryptStudentFields } from '../crypto-helper.js';
import { logAudit, maskName, maskRut, maskDiagnosis, getUserRole } from '../audit-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const { studentId, fullAccess } = await request.json();
    if (!studentId) return new Response(JSON.stringify({ ok: false, error: 'studentId requerido.' }), { status: 400, headers });

    const tenant = await resolveTenant(request, env, user);
    if (!tenant) return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers });
    const tenantId = tenant.id;

    const student = await env.DB.prepare(
      'SELECT * FROM students WHERE id = ? AND tenant_id = ?'
    ).bind(studentId, tenantId).first();

    if (!student) return new Response(JSON.stringify({ ok: false, error: 'No encontrado.' }), { status: 404, headers });

    // Descifrar campos sensibles
    const decrypted = await decryptStudentFields(student, env.ENCRYPTION_KEY);

    // Determinar nivel de acceso segun rol
    const role = await getUserRole(env, user.email);
    const canSeeFullData = role === 'admin' || role === 'coordinator';

    let responseStudent;

    if (fullAccess && canSeeFullData) {
      // Acceso completo: admin/coordinador solicitando datos completos
      responseStudent = decrypted;

      // Registrar en audit log (acceso a datos sensibles completos)
      await logAudit(env, request, user, 'VIEW_FULL_STUDENT', 'students', studentId,
        'Full data access by ' + role);
    } else if (fullAccess && !canSeeFullData && student.user_email === user.email) {
      // Profesor pidiendo acceso completo: solo de estudiantes que ELLOS crearon
      // (sin esta verificacion el flag fullAccess del cliente anulaba la mascara).
      responseStudent = decrypted;

      await logAudit(env, request, user, 'VIEW_FULL_STUDENT', 'students', studentId,
        'Owner access by ' + role);
    } else {
      // Vista por defecto: datos enmascarados
      responseStudent = {
        ...decrypted,
        rut: maskRut(decrypted.rut || ''),
        guardian: decrypted.guardian ? decrypted.guardian.split(' ')[0][0] + '. ' + (decrypted.guardian.split(' ').pop() || '') : '-'
      };
    }

    // OAs agrupados por asignatura
    const oas = await env.DB.prepare(`
      SELECT subject, subject_key, level, oa_code, oa_text, trimester, unit_name,
             COUNT(*) as times_worked
      FROM document_oas
      WHERE student_id = ?
      GROUP BY subject_key, oa_code
      ORDER BY subject, oa_code
    `).bind(studentId).all();

    // Documentos
    const docs = await env.DB.prepare(`
      SELECT id, trimester, subject, subject_key, work_level, date_start, date_end,
             num_classes, created_at
      FROM documents
      WHERE student_id = ? AND tenant_id = ?
      ORDER BY created_at DESC
    `).bind(studentId, tenantId).all();

    return new Response(JSON.stringify({
      ok: true,
      student: responseStudent,
      oas: oas.results || [],
      documents: docs.results || [],
      accessLevel: canSeeFullData ? 'full' : 'owner'
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
