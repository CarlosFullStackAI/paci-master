// GET /api/tenants -> lista de establecimientos activos.
// Publico (sin auth): lo usa el selector de colegio en el registro.
export async function onRequestGet(context) {
  const { env } = context;
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ ok: true, tenants: [] }), { headers });
    }
    const res = await env.DB.prepare(
      'SELECT slug, nombre, nombre_corto FROM tenants WHERE activo = 1 ORDER BY nombre'
    ).all();
    return new Response(JSON.stringify({ ok: true, tenants: res.results || [] }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'No se pudieron cargar los establecimientos.', tenants: [] }), { status: 500, headers });
  }
}
