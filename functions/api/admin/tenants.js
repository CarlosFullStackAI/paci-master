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
        `SELECT id, slug, nombre, nombre_corto, rbd, comuna, localidad, region, branding_json, calendario_json, join_code, activo, created_at, updated_at
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
        const calendario = buildCalendario(body, '');
        const joinCode = genCode();
        await env.DB.prepare(
          `INSERT INTO tenants (slug, nombre, nombre_corto, rbd, comuna, localidad, region, branding_json, calendario_json, join_code, activo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
        ).bind(
          slug, nombre, clip(body.nombre_corto, 80), clip(body.rbd, 20),
          clip(body.comuna, 80), clip(body.localidad, 80), clip(body.region, 80), branding, calendario, joinCode
        ).run();

        return new Response(JSON.stringify({ ok: true, message: `Establecimiento "${nombre}" creado. Codigo de union: ${joinCode}`, joinCode }), { status: 201, headers });
      }

      if (action === 'update') {
        const id = parseInt(body.id, 10);
        if (!id) return bad('id requerido.');
        const nombre = clip(body.nombre, 160).trim();
        if (!nombre) return bad('El nombre del establecimiento es obligatorio.');

        const existing = await env.DB.prepare('SELECT id, calendario_json FROM tenants WHERE id = ?').bind(id).first();
        if (!existing) return bad('Establecimiento no encontrado.', 404);

        // El slug (subdominio) NO se edita: cambiarlo desvincularia a los usuarios.
        const branding = buildBranding(body);
        // Merge sobre el calendario existente: preserva claves que el editor simple
        // no maneja (eventos, ano).
        const calendario = buildCalendario(body, existing.calendario_json || '');
        const activo = body.activo === false || body.activo === 0 ? 0 : 1;
        await env.DB.prepare(
          `UPDATE tenants SET nombre = ?, nombre_corto = ?, rbd = ?, comuna = ?, localidad = ?,
             region = ?, branding_json = ?, calendario_json = ?, activo = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).bind(
          nombre, clip(body.nombre_corto, 80), clip(body.rbd, 20),
          clip(body.comuna, 80), clip(body.localidad, 80), clip(body.region, 80),
          branding, calendario, activo, id
        ).run();

        return new Response(JSON.stringify({ ok: true, message: `Establecimiento "${nombre}" actualizado.` }), { headers });
      }

      if (action === 'regenerate-code') {
        const id = parseInt(body.id, 10);
        if (!id) return bad('id requerido.');
        const existing = await env.DB.prepare('SELECT id FROM tenants WHERE id = ?').bind(id).first();
        if (!existing) return bad('Establecimiento no encontrado.', 404);
        const joinCode = genCode();
        await env.DB.prepare(`UPDATE tenants SET join_code = ?, updated_at = datetime('now') WHERE id = ?`).bind(joinCode, id).run();
        return new Response(JSON.stringify({ ok: true, message: `Nuevo codigo de union: ${joinCode}`, joinCode }), { headers });
      }

      return bad('Accion invalida. Usa "create", "update" o "regenerate-code".');
    }

    return new Response(JSON.stringify({ ok: false, error: 'Metodo no permitido.' }), { status: 405, headers });

    function bad(error, status = 400) {
      return new Response(JSON.stringify({ ok: false, error }), { status, headers });
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno.' }), { status: 500, headers });
  }
}

// Genera un codigo de union aleatorio (8 chars, alfabeto sin caracteres ambiguos O/0/I/1).
function genCode() {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += alpha.charAt(b % alpha.length);
  return out;
}

// slug = subdominio: solo minusculas, numeros y guiones; 2-40 chars. '' si invalido.
function normalizeSlug(s) {
  const v = String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  return /^[a-z0-9-]{2,40}$/.test(v) ? v : '';
}

function clip(s, n) {
  return String(s == null ? '' : s).slice(0, n);
}

// Construye el JSON del calendario escolar desde body.calendario, haciendo merge
// sobre el JSON existente (preserva eventos/ano que el editor simple no toca).
// Estructura aceptada: { trimestres: {1er|2do|3er: {inicio, fin}},
//   vacaciones: [{inicio, fin, nombre}], diasSinClases: {fecha: motivo} }
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function buildCalendario(body, existingJson) {
  const c = body && body.calendario;
  if (c === undefined || c === null) return existingJson || ''; // sin cambios
  let out = {};
  try { out = existingJson ? JSON.parse(existingJson) : {}; } catch (e) { out = {}; }
  if (typeof out !== 'object' || Array.isArray(out) || !out) out = {};

  // Reflect.get + Object.fromEntries: evita acceso indexado dinamico
  // (mismo patron anti object-injection que students/update.js).
  const trIn = (c.trimestres && typeof c.trimestres === 'object') ? c.trimestres : {};
  const trEntries = [];
  ['1er', '2do', '3er'].forEach((k) => {
    const t = Reflect.get(trIn, k);
    if (t && DATE_RE.test(String(t.inicio || '')) && DATE_RE.test(String(t.fin || ''))) {
      trEntries.push([k, { inicio: t.inicio, fin: t.fin }]);
    }
  });
  // Solo se aplica el bloque de trimestres si vienen los 3 completos (evita
  // dejar el calendario a medias por un campo vacio).
  if (trEntries.length === 3) out.trimestres = Object.fromEntries(trEntries);

  if (Array.isArray(c.vacaciones)) {
    out.vacaciones = c.vacaciones
      .filter((v) => v && DATE_RE.test(String(v.inicio || '')) && DATE_RE.test(String(v.fin || '')))
      .slice(0, 12)
      .map((v) => ({ inicio: v.inicio, fin: v.fin, nombre: clip(v.nombre, 120) }));
  }

  if (c.diasSinClases && typeof c.diasSinClases === 'object' && !Array.isArray(c.diasSinClases)) {
    const dsEntries = Object.keys(c.diasSinClases)
      .slice(0, 60)
      .filter((d) => DATE_RE.test(d))
      .map((d) => [d, clip(Reflect.get(c.diasSinClases, d), 160)]);
    out.diasSinClases = Object.fromEntries(dsEntries);
  }

  return JSON.stringify(out);
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
