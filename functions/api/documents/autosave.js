import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';
import { encrypt } from '../crypto-helper.js';
import { checkPermission } from '../rbac-helper.js';

// POST /api/documents/autosave
// UPSERT: actualiza si existe documento para el mismo estudiante+trimestre, sino inserta
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    // Solo roles con permiso de edicion
    const denied = checkPermission(user.role, 'paci:edit');
    if (denied) return denied;

    const body = await request.json();
    const { student, modules, trimester, team, documentId } = body;

    if (!student || !student.name) {
      return new Response(JSON.stringify({ ok: false, error: 'Datos minimos requeridos (nombre estudiante).' }), { status: 400, headers });
    }

    const tenant = await resolveTenant(request, env, user);
    if (!tenant) return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers });
    const tenantId = tenant.id;

    const db = env.DB;

    // Buscar estudiante existente en el establecimiento (compartido por colegio)
    let studentRow = await db.prepare(
      'SELECT id FROM students WHERE tenant_id = ? AND name = ?'
    ).bind(tenantId, student.name).first();

    // Cifrar diagnostico
    const encDiag = env.ENCRYPTION_KEY
      ? await encrypt(student.diagnosis || '', env.ENCRYPTION_KEY)
      : (student.diagnosis || '');

    if (!studentRow) {
      const res = await db.prepare(
        `INSERT INTO students (user_email, name, diagnosis, diagnosis_id, real_level, work_level, school, birth_date, age, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        user.email, student.name, encDiag, student.diagnosisId || '',
        student.realLevel || '', student.workLevel || '', student.school || '',
        student.birthDate || '', student.age || 0, tenantId
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
    const mods = modules || [];

    // Calcular resumen
    const subjects = [...new Set(mods.map(m => m.asig).filter(Boolean))].join(', ');
    const subjectKeys = [...new Set(mods.map(m => m.asigKey).filter(Boolean))].join(',');
    const allClases = mods.flatMap(m => m.clases || []);
    const dateStart = allClases.length ? allClases[0].date || '' : '';
    const dateEnd = allClases.length ? allClases[allClases.length - 1].date || '' : '';
    const numClasses = allClases.length;

    const docJson = JSON.stringify({ student, team, modules: mods });

    let docId = documentId;

    if (docId) {
      // Verificar que el documento existe y pertenece al establecimiento
      const existing = await db.prepare(
        'SELECT id, updated_at FROM documents WHERE id = ? AND tenant_id = ?'
      ).bind(docId, tenantId).first();

      if (existing) {
        // UPDATE existente
        await db.prepare(
          `UPDATE documents SET trimester = ?, subject = ?, subject_key = ?, work_level = ?,
           date_start = ?, date_end = ?, num_classes = ?, document_json = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).bind(
          trimester || '', subjects, subjectKeys, student.workLevel || '',
          dateStart, dateEnd, numClasses, docJson, docId
        ).run();
      } else {
        // El documento no existe o no es del usuario, crear nuevo
        docId = null;
      }
    }

    if (!docId) {
      // Buscar documento existente para mismo estudiante + trimestre (UPSERT logic).
      // Excluir miembros de una familia (plan anual padre o trimestres hijos) para
      // que el autoguardado a ciegas NUNCA sobreescriba un documento vinculado.
      const existingDoc = await db.prepare(
        `SELECT id FROM documents
         WHERE tenant_id = ? AND student_id = ? AND trimester = ?
           AND parent_id IS NULL AND (plan_scope IS NULL OR plan_scope <> 'anual')`
      ).bind(tenantId, studentId, trimester || '').first();

      if (existingDoc) {
        docId = existingDoc.id;
        await db.prepare(
          `UPDATE documents SET subject = ?, subject_key = ?, work_level = ?,
           date_start = ?, date_end = ?, num_classes = ?, document_json = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).bind(
          subjects, subjectKeys, student.workLevel || '',
          dateStart, dateEnd, numClasses, docJson, docId
        ).run();
      } else {
        // INSERT nuevo
        const docRes = await db.prepare(
          `INSERT INTO documents (user_email, student_id, trimester, subject, subject_key, work_level, date_start, date_end, num_classes, document_json, tenant_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          user.email, studentId, trimester || '', subjects, subjectKeys,
          student.workLevel || '', dateStart, dateEnd, numClasses, docJson, tenantId
        ).run();
        docId = docRes.meta.last_row_id;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      documentId: docId,
      studentId,
      autosaved: true,
      message: 'Autoguardado exitoso.'
    }), { status: 200, headers });

  } catch (e) {
    console.error('Error en autosave:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Error en el autoguardado.' }), { status: 500, headers });
  }
}
