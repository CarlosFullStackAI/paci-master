import { getUser } from '../auth-helper.js';
import { encrypt } from '../crypto-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const body = await request.json();
    const { student, modules, trimester, team } = body;

    if (!student || !student.name || !modules || !modules.length) {
      return new Response(JSON.stringify({ ok: false, error: 'Datos incompletos.' }), { status: 400, headers });
    }

    const db = env.DB;

    // Buscar o crear estudiante
    let studentRow = await db.prepare(
      'SELECT id FROM students WHERE user_email = ? AND name = ?'
    ).bind(user.email, student.name).first();

    // Cifrar campo sensible (diagnostico) antes de guardar
    const encDiag = env.ENCRYPTION_KEY
      ? await encrypt(student.diagnosis || '', env.ENCRYPTION_KEY)
      : (student.diagnosis || '');

    if (!studentRow) {
      const res = await db.prepare(
        `INSERT INTO students (user_email, name, diagnosis, diagnosis_id, real_level, work_level, school, birth_date, age)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        user.email, student.name, encDiag, student.diagnosisId || '',
        student.realLevel || '', student.workLevel || '', student.school || '',
        student.birthDate || '', student.age || 0
      ).run();
      studentRow = { id: res.meta.last_row_id };
    } else {
      await db.prepare(
        `UPDATE students SET diagnosis = ?, diagnosis_id = ?, real_level = ?, work_level = ?,
         school = ?, birth_date = ?, age = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(
        encDiag, student.diagnosisId || '', student.realLevel || '',
        student.workLevel || '', student.school || '', student.birthDate || '',
        student.age || 0, studentRow.id
      ).run();
    }

    const studentId = studentRow.id;

    // Calcular resumen: asignaturas, fechas, total clases
    const subjects = [...new Set(modules.map(m => m.asig).filter(Boolean))].join(', ');
    const subjectKeys = [...new Set(modules.map(m => m.asigKey).filter(Boolean))].join(',');
    const allClases = modules.flatMap(m => m.clases || []);
    const dateStart = allClases.length ? allClases[0].date || '' : '';
    const dateEnd = allClases.length ? allClases[allClases.length - 1].date || '' : '';
    const numClasses = allClases.length;

    // Guardar TODO como UN solo documento
    const docJson = JSON.stringify({
      student,
      team,
      modules
    });

    const docRes = await db.prepare(
      `INSERT INTO documents (user_email, student_id, trimester, subject, subject_key, work_level, date_start, date_end, num_classes, document_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.email, studentId, trimester || '', subjects, subjectKeys,
      student.workLevel || '', dateStart, dateEnd, numClasses, docJson
    ).run();

    const docId = docRes.meta.last_row_id;

    // Guardar OAs de todos los modulos
    const oaStmts = [];
    for (const mod of modules) {
      if (mod.oas && mod.oas.length) {
        for (const oa of mod.oas) {
          oaStmts.push(
            db.prepare(
              `INSERT INTO document_oas (document_id, student_id, subject, subject_key, level, unit_name, oa_code, oa_text, trimester)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              docId, studentId, mod.asig || '', mod.asigKey || '',
              mod.nivelTrabajo || '', oa.unit || '', oa.code || '', oa.text || '',
              trimester || ''
            )
          );
        }
      }
    }

    if (oaStmts.length > 0) {
      await db.batch(oaStmts);
    }

    return new Response(JSON.stringify({
      ok: true,
      studentId,
      documentId: docId,
      message: `PACI guardado con ${modules.length} modulo(s) y ${oaStmts.length} OA(s).`
    }), { status: 201, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error al guardar: ' + e.message }), { status: 500, headers });
  }
}
