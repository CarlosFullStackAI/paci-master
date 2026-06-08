import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';

// POST /api/students/courses
// Devuelve la lista de cursos del usuario con su conteo de estudiantes.
// Util para mostrar agrupacion "por curso" en el picker de docs.html y en el dashboard.
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const tenant = await resolveTenant(request, env, user);
    if (!tenant) return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers });
    const tenantId = tenant.id;

    const rows = await env.DB.prepare(`
      SELECT
        COALESCE(NULLIF(TRIM(curso), ''), '— sin curso —') AS curso,
        COUNT(*) AS count
      FROM students
      WHERE tenant_id = ?
      GROUP BY COALESCE(NULLIF(TRIM(curso), ''), '— sin curso —')
      ORDER BY curso ASC
    `).bind(tenantId).all();

    return new Response(JSON.stringify({
      ok: true,
      courses: rows.results || []
    }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno.' }), { status: 500, headers });
  }
}
