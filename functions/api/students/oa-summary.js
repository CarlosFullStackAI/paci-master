import { getUser } from '../auth-helper.js';

// POST /api/students/oa-summary
// Resumen agregado de progreso de OAs por estudiante
// { studentId }
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return new Response(JSON.stringify({ ok: false, error: 'studentId requerido.' }), { status: 400, headers });
    }

    // Obtener todos los OAs del estudiante con su progreso
    const oas = await env.DB.prepare(
      `SELECT do.id, do.subject, do.subject_key, do.level, do.unit_name,
              do.oa_code, do.oa_text, do.trimester,
              do.progress_status, do.progress_observations, do.evaluated_at, do.evaluated_by,
              d.id as document_id
       FROM document_oas do
       JOIN documents d ON do.document_id = d.id
       WHERE do.student_id = ?
       ORDER BY do.subject_key, do.trimester, do.oa_code`
    ).bind(studentId).all();

    const allOas = oas.results || [];

    // Agrupar por asignatura -> trimestre -> status
    const summary = {};
    const totals = { logrado: 0, en_desarrollo: 0, no_logrado: 0, no_evaluado: 0 };

    allOas.forEach(oa => {
      const key = oa.subject_key || 'sin_asignatura';
      if (!summary[key]) {
        summary[key] = { name: oa.subject, trimesters: {} };
      }
      const trim = oa.trimester || 'Sin trimestre';
      if (!summary[key].trimesters[trim]) {
        summary[key].trimesters[trim] = { logrado: 0, en_desarrollo: 0, no_logrado: 0, no_evaluado: 0, oas: [] };
      }
      const status = oa.progress_status || 'no_evaluado';
      summary[key].trimesters[trim][status]++;
      summary[key].trimesters[trim].oas.push({
        id: oa.id,
        code: oa.oa_code,
        text: oa.oa_text,
        unit: oa.unit_name,
        status,
        observations: oa.progress_observations || '',
        evaluatedAt: oa.evaluated_at || '',
        evaluatedBy: oa.evaluated_by || ''
      });
      totals[status]++;
    });

    return new Response(JSON.stringify({
      ok: true,
      studentId,
      totalOAs: allOas.length,
      totals,
      summary
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error: ' + e.message }), { status: 500, headers });
  }
}
