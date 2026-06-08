// GET /api/tenant-config -> configuracion del establecimiento (tenant) actual.
// Resuelve por subdominio del Host; si no hay, por el establecimiento del usuario
// logueado; y como ultimo recurso, el primer establecimiento activo (para que el
// login muestre branding aunque nadie haya iniciado sesion).
import { getUser } from './auth-helper.js';
import { resolveTenant } from './tenant-helper.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  // no-store: la config depende del subdominio / usuario; no debe cachearse compartida.
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

  try {
    const user = await getUser(request, env).catch(() => null);
    let tenant = await resolveTenant(request, env, user);

    // Fallback final: primer establecimiento activo.
    if (!tenant && env.DB) {
      tenant = await env.DB.prepare(
        'SELECT id, slug, nombre, nombre_corto, rbd, comuna, localidad, region, branding_json FROM tenants WHERE activo = 1 ORDER BY id LIMIT 1'
      ).first();
    }

    if (!tenant) {
      return new Response(JSON.stringify({
        id: '', nombre: 'PIE MASTER', nombre_corto: 'PIE MASTER', localidad: '', region: '', branding: {}
      }), { headers });
    }

    let branding = {};
    try { branding = tenant.branding_json ? JSON.parse(tenant.branding_json) : {}; } catch (e) { branding = {}; }

    return new Response(JSON.stringify({
      id: tenant.slug,
      nombre: tenant.nombre,
      nombre_corto: tenant.nombre_corto || tenant.nombre,
      localidad: tenant.localidad || '',
      region: tenant.region || '',
      branding
    }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error al cargar la configuracion del establecimiento.' }), { status: 500, headers });
  }
}
