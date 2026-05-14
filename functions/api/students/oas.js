import { getUser } from '../auth-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const { studentId, subjectKey, level } = await request.json();
    if (!studentId) return new Response(JSON.stringify({ ok: false, error: 'studentId requerido.' }), { status: 400, headers });

    // OAs trabajados agrupados por asignatura y trimestre
    let query = `
      SELECT oa.subject, oa.subject_key, oa.level, oa.unit_name, oa.oa_code, oa.oa_text,
             oa.trimester, d.created_at, d.id as document_id
      FROM document_oas oa
      JOIN documents d ON oa.document_id = d.id
      WHERE oa.student_id = ? AND d.user_email = ?
    `;
    const params = [studentId, user.email];

    if (subjectKey) {
      query += ' AND oa.subject_key = ?';
      params.push(subjectKey);
    }
    if (level) {
      query += ' AND oa.level = ?';
      params.push(level);
    }

    query += ' ORDER BY oa.subject, oa.trimester, oa.oa_code';

    const oas = await env.DB.prepare(query).bind(...params).all();

    // Agrupar por asignatura. Map evita acceso indexado dinamico y
    // protege contra prototype-pollution si subject_key o trimester llegaran
    // a contener __proto__ / constructor.
    const grouped = new Map();
    for (const oa of (oas.results || [])) {
      const key = oa.subject_key;
      if (!grouped.has(key)) {
        grouped.set(key, {
          subject: oa.subject,
          subjectKey: key,
          level: oa.level,
          trimesters: new Map()
        });
      }
      const subj = grouped.get(key);
      if (!subj.trimesters.has(oa.trimester)) {
        subj.trimesters.set(oa.trimester, []);
      }
      const trimList = subj.trimesters.get(oa.trimester);
      // Evitar duplicados
      if (!trimList.some(o => o.code === oa.oa_code)) {
        trimList.push({
          code: oa.oa_code,
          text: oa.oa_text,
          unit: oa.unit_name
        });
      }
    }

    // Convertir Maps a objeto plano para serializacion JSON
    const groupedObj = Object.fromEntries(
      Array.from(grouped, ([k, v]) => [k, {
        subject: v.subject,
        subjectKey: v.subjectKey,
        level: v.level,
        trimesters: Object.fromEntries(v.trimesters)
      }])
    );

    return new Response(JSON.stringify({
      ok: true,
      oas: groupedObj,
      raw: oas.results || []
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
