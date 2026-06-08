// GET/POST /api/ai/context
// Contexto para la IA, guardado en D1 con UNA fila por establecimiento (tenant).
// Compartido entre los docentes del mismo colegio (recursos, contexto del aula, DUA...).
import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';

export async function onRequest(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const tenant = await resolveTenant(request, env, user);
    if (!tenant) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers });
    }
    const tenantId = tenant.id;

    if (request.method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM ai_contexts WHERE tenant_id = ?').bind(tenantId).first();
      const ctx = row ? {
        duracion: row.duracion || '',
        estrategiasEval: parseArr(row.estrategias_eval),
        duaChecks: parseArr(row.dua_checks),
        contexto: row.contexto || '',
        conocimientos: row.conocimientos || '',
        intereses: row.intereses || '',
        recursos: row.recursos || '',
        duaDetalle: row.dua_detalle || ''
      } : null;
      return new Response(JSON.stringify({
        ok: true, context: ctx,
        updatedAt: (row && row.updated_at) || '',
        updatedBy: (row && row.updated_by) || ''
      }), { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const c = (body && body.context) || body || {};

      const duracion = clip(c.duracion, 20);
      const estrategiasEval = JSON.stringify(toArr(c.estrategiasEval).slice(0, 30).map(s => clip(s, 120)));
      const duaChecks = JSON.stringify(toArr(c.duaChecks).slice(0, 30).map(s => clip(s, 120)));
      const contexto = clip(c.contexto, 4000);
      const conocimientos = clip(c.conocimientos, 4000);
      const intereses = clip(c.intereses, 2000);
      const recursos = clip(c.recursos, 4000);
      const duaDetalle = clip(c.duaDetalle, 4000);

      await env.DB.prepare(
        `INSERT INTO ai_contexts
           (tenant_id, duracion, estrategias_eval, dua_checks, contexto, conocimientos, intereses, recursos, dua_detalle, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
         ON CONFLICT(tenant_id) DO UPDATE SET
           duracion = excluded.duracion,
           estrategias_eval = excluded.estrategias_eval,
           dua_checks = excluded.dua_checks,
           contexto = excluded.contexto,
           conocimientos = excluded.conocimientos,
           intereses = excluded.intereses,
           recursos = excluded.recursos,
           dua_detalle = excluded.dua_detalle,
           updated_at = datetime('now'),
           updated_by = excluded.updated_by`
      ).bind(tenantId, duracion, estrategiasEval, duaChecks, contexto, conocimientos, intereses, recursos, duaDetalle, user.email).run();

      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Metodo no permitido.' }), { status: 405, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno al guardar el contexto.' }), { status: 500, headers });
  }
}

function clip(s, n) {
  return String(s == null ? '' : s).slice(0, n);
}
function toArr(v) {
  return Array.isArray(v) ? v : [];
}
function parseArr(s) {
  try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
