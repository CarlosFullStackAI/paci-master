import { getUser } from '../auth-helper.js';

// GET /api/mineduc/establecimientos?q=<texto o RBD>
// Busca en el directorio oficial MINEDUC (tabla mineduc_establecimientos,
// cargada desde datosabiertos.mineduc.cl por scripts/build-establecimientos.js).
// Requiere sesion (cualquier rol): lo usan admin.html y los editores de docentes.
export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    if (q.length < 2) {
      return new Response(JSON.stringify({ ok: true, resultados: [] }), { headers });
    }

    let rows;
    if (/^\d{1,6}$/.test(q)) {
      // Busqueda por RBD exacto o por prefijo
      rows = await env.DB.prepare(
        `SELECT rbd, dgv, nombre, region, comuna, dependencia, rural, convenio_pie, matricula
         FROM mineduc_establecimientos
         WHERE rbd = ?1 OR CAST(rbd AS TEXT) LIKE ?2
         ORDER BY (rbd = ?1) DESC, matricula DESC
         LIMIT 10`
      ).bind(parseInt(q, 10), q + '%').all();
    } else {
      // Busqueda por nombre. El directorio viene sin tildes en los nombres,
      // asi que normalizamos la consulta (quita acentos) para que coincida.
      const sinTildes = q.normalize('NFD').replace(/[̀-ͯ]/g, '');
      // Cada palabra debe aparecer en el nombre (busqueda tipo AND)
      const palabras = sinTildes.split(/\s+/).filter(Boolean).slice(0, 5);
      const conds = palabras.map((_, i) => `nombre LIKE ?${i + 1} COLLATE NOCASE`).join(' AND ');
      const binds = palabras.map((p) => '%' + p + '%');
      rows = await env.DB.prepare(
        `SELECT rbd, dgv, nombre, region, comuna, dependencia, rural, convenio_pie, matricula
         FROM mineduc_establecimientos
         WHERE ${conds}
         ORDER BY (nombre LIKE ?${palabras.length + 1} COLLATE NOCASE) DESC, matricula DESC
         LIMIT 10`
      ).bind(...binds, sinTildes + '%').all();
    }

    return new Response(JSON.stringify({ ok: true, resultados: rows.results || [] }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
