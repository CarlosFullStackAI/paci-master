import { getUser } from '../auth-helper.js';
import { checkPermission } from '../rbac-helper.js';

// CRUD de establecimientos (colegios). Solo admin o la cuenta maestra.
// GET  /api/admin/tenants                 -> lista todos los colegios (con todos los campos)
// POST /api/admin/tenants { action:'create'|'update', ... }
export async function onRequest(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    // Solo admin o la cuenta maestra (mismo patron que admin/set-role.js).
    const masterEmail = env.MASTER_ADMIN_EMAIL || 'carlos45335@gmail.com';
    const denied = checkPermission(user.role, 'admin:tenants');
    if (denied && user.email !== masterEmail) return denied;

    if (!env.DB) return new Response(JSON.stringify({ ok: false, error: 'Base de datos no disponible.' }), { status: 500, headers });

    if (request.method === 'GET') {
      const res = await env.DB.prepare(
        `SELECT id, slug, nombre, nombre_corto, rbd, comuna, localidad, region, branding_json, activo, created_at, updated_at
         FROM tenants ORDER BY nombre`
      ).all();
      return new Response(JSON.stringify({ ok: true, tenants: res.results || [] }), { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const action = body.action;

      if (action === 'create') {
        const slug = normalizeSlug(body.slug);
        const nombre = clip(body.nombre, 160).trim();
        if (!slug) return bad('El identificador (slug) es invalido. Usa minusculas, numeros y guiones (2-40).');
        if (!nombre) return bad('El nombre del establecimiento es obligatorio.');

        const exists = await env.DB.prepare('SELECT id FROM tenants WHERE slug = ?').bind(slug).first();
        if (exists) return bad('Ya existe un establecimiento con ese identificador.', 409);

        const branding = buildBranding(body);
        await env.DB.prepare(
          `INSERT INTO tenants (slug, nombre, nombre_corto, rbd, comuna, localidad, region, branding_json, activo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
        ).bind(
          slug, nombre, clip(body.nombre_corto, 80), clip(body.rbd, 20),
          clip(body.comuna, 80), clip(body.localidad, 80), clip(body.region, 80), branding
        ).run();

        return new Response(JSON.stringify({ ok: true, message: `Establecimiento "${nombre}" creado.` }), { status: 201, headers });
      }

      if (action === 'update') {
        const id = parseInt(body.id, 10);
        if (!id) return bad('id requerido.');
        const nombre = clip(body.nombre, 160).trim();
        if (!nombre) return bad('El nombre del establecimiento es obligatorio.');

        const existing = await env.DB.prepare('SELECT id FROM tenants WHERE id = ?').bind(id).first();
        if (!existing) return bad('Establecimiento no encontrado.', 404);

        // El slug (subdominio) NO se edita: cambiarlo desvincularia a los usuarios.
        const branding = buildBranding(body);
        const activo = body.activo === false || body.activo === 0 ? 0 : 1;
        await env.DB.prepare(
          `UPDATE tenants SET nombre = ?, nombre_corto = ?, rbd = ?, comuna = ?, localidad = ?,
             region = ?, branding_json = ?, activo = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).bind(
          nombre, clip(body.nombre_corto, 80), clip(body.rbd, 20),
          clip(body.comuna, 80), clip(body.localidad, 80), clip(body.region, 80),
          branding, activo, id
        ).run();

        return new Response(JSON.stringify({ ok: true, message: `Establecimiento "${nombre}" actualizado.` }), { headers });
      }

      return bad('Accion invalida. Usa "create" o "update".');
    }

    return new Response(JSON.stringify({ ok: false, error: 'Metodo no permitido.' }), { status: 405, headers });

    function bad(error, status = 400) {
      return new Response(JSON.stringify({ ok: false, error }), { status, headers });
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno.' }), { status: 500, headers });
  }
}

// slug = subdominio: solo minusculas, numeros y guiones; 2-40 chars. '' si invalido.
function normalizeSlug(s) {
  const v = String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  return /^[a-z0-9-]{2,40}$/.test(v) ? v : '';
}

function clip(s, n) {
  return String(s == null ? '' : s).slice(0, n);
}

// Construye el JSON de branding desde los campos de color/logos del body.
function buildBranding(body) {
  const b = (body && body.branding) || {};
  const out = {
    color_primario: clip(b.color_primario || body.color_primario || '#091845', 9),
    color_secundario: clip(b.color_secundario || body.color_secundario || '#1240c4', 9)
  };
  if (b.logo_principal) out.logo_principal = clip(b.logo_principal, 200);
  if (b.logo_pie) out.logo_pie = clip(b.logo_pie, 200);
  return JSON.stringify(out);
}
