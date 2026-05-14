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
    // oa_text_original: texto MINEDUC inmutable; oa_text_adapted: texto editado por el educador
    const oas = await env.DB.prepare(
      `SELECT do.id, do.subject, do.subject_key, do.level, do.unit_name,
              do.oa_code, do.oa_text, do.oa_text_original, do.oa_text_adapted, do.trimester,
              do.progress_status, do.progress_observations, do.evaluated_at, do.evaluated_by,
              d.id as document_id
       FROM document_oas do
       JOIN documents d ON do.document_id = d.id
       WHERE do.student_id = ?
       ORDER BY do.subject_key, do.trimester, do.oa_code`
    ).bind(studentId).all();

    const allOas = oas.results || [];

    // Agrupar por asignatura -> trimestre -> status. Map evita acceso
    // indexado dinamico (subject_key, trimester) y protege contra
    // prototype-pollution. Para los contadores por status usamos un
    // switch sobre allowlist en lugar de incrementar dinamicamente.
    const summary = new Map();
    const totals = { logrado: 0, en_desarrollo: 0, no_logrado: 0, no_evaluado: 0 };
    const VALID_STATUSES = new Set(['logrado', 'en_desarrollo', 'no_logrado', 'no_evaluado']);

    allOas.forEach(oa => {
      const key = oa.subject_key || 'sin_asignatura';
      if (!summary.has(key)) {
        summary.set(key, { name: oa.subject, trimesters: new Map() });
      }
      const subjEntry = summary.get(key);
      const trim = oa.trimester || 'Sin trimestre';
      if (!subjEntry.trimesters.has(trim)) {
        subjEntry.trimesters.set(trim, { logrado: 0, en_desarrollo: 0, no_logrado: 0, no_evaluado: 0, oas: [] });
      }
      const trimEntry = subjEntry.trimesters.get(trim);
      const status = VALID_STATUSES.has(oa.progress_status) ? oa.progress_status : 'no_evaluado';

      // status validado contra allowlist: incrementar via switch evita
      // acceso indexado dinamico en trimEntry/totals.
      switch (status) {
        case 'logrado': trimEntry.logrado++; totals.logrado++; break;
        case 'en_desarrollo': trimEntry.en_desarrollo++; totals.en_desarrollo++; break;
        case 'no_logrado': trimEntry.no_logrado++; totals.no_logrado++; break;
        default: trimEntry.no_evaluado++; totals.no_evaluado++;
      }

      // text expone el texto adecuado (lo que el educador trabaja)
      // textoOriginal expone el texto MINEDUC para trazabilidad / comparacion
      const textoAdecuado = oa.oa_text_adapted || oa.oa_text || '';
      const textoOriginal = oa.oa_text_original || oa.oa_text || textoAdecuado;
      trimEntry.oas.push({
        id: oa.id,
        code: oa.oa_code,
        text: textoAdecuado,
        textoOriginal,
        textoAdecuado,
        adecuado: textoOriginal !== textoAdecuado,
        unit: oa.unit_name,
        status,
        observations: oa.progress_observations || '',
        evaluatedAt: oa.evaluated_at || '',
        evaluatedBy: oa.evaluated_by || ''
      });
    });

    // Convertir Maps a objeto plano para serializacion JSON
    const summaryObj = Object.fromEntries(
      Array.from(summary, ([k, v]) => [k, {
        name: v.name,
        trimesters: Object.fromEntries(v.trimesters)
      }])
    );

    return new Response(JSON.stringify({
      ok: true,
      studentId,
      totalOAs: allOas.length,
      totals,
      summary: summaryObj
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error: ' + e.message }), { status: 500, headers });
  }
}
