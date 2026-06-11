// Helpers de multi-establecimiento (tenant).
// Resuelve el establecimiento por subdominio del Host; si no hay subdominio
// (ej. pages.dev o local), cae al establecimiento guardado en el perfil del usuario.

// Primeros labels que NO representan un colegio (plataforma/genericos).
const NON_TENANT_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin']);

// Extrae el slug de colegio desde el Host. Ej: "lcm-pulebu.piemaster.cl" -> "lcm-pulebu".
// Devuelve null si el host no tiene subdominio de colegio (pages.dev, apex, localhost, IP).
export function getSubdomainSlug(request) {
  try {
    const host = (request.headers.get('Host') || new URL(request.url).host || '')
      .split(':')[0].toLowerCase().trim();
    if (!host || host === 'localhost' || host.endsWith('.pages.dev') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return null;
    }
    const labels = host.split('.');
    // Necesita al menos subdominio.dominio.tld (3 labels) para tener subdominio.
    if (labels.length < 3) return null;
    const sub = labels[0];
    if (!sub || NON_TENANT_SUBDOMAINS.has(sub)) return null;
    return sub;
  } catch (e) {
    return null;
  }
}

// Busca un establecimiento activo por slug en D1. Devuelve el row o null.
export async function getTenantBySlug(env, slug) {
  if (!slug || !env || !env.DB) return null;
  try {
    return await env.DB.prepare(
      'SELECT id, slug, nombre, nombre_corto, rbd, comuna, localidad, region, branding_json FROM tenants WHERE slug = ? AND activo = 1'
    ).bind(slug).first();
  } catch (e) {
    return null;
  }
}

// Resuelve el establecimiento del request:
//   1) por subdominio del Host (cuando hay dominio propio configurado);
//   2) fallback: el establecimiento del usuario logueado (user.tenantSlug).
// `user` es el objeto que devuelve getUser (puede o no traer tenantSlug). Row o null.
export async function resolveTenant(request, env, user) {
  const subSlug = getSubdomainSlug(request);
  if (subSlug) {
    const t = await getTenantBySlug(env, subSlug);
    if (t) {
      // El subdominio NUNCA puede otorgar acceso a un colegio distinto del
      // asignado al usuario: un token del colegio A usado en el subdominio
      // del colegio B no debe heredar el tenant B (cross-tenant).
      if (user && user.tenantSlug && user.tenantSlug !== t.slug) return null;
      return t;
    }
  }
  // Si el usuario YA tiene colegio asignado, ese es el unico valido. Si no resuelve
  // (colegio borrado/inactivo), NO caemos a otro colegio: devolvemos null (sin acceso).
  // Evita fuga: un tenantSlug invalido no debe heredar el unico colegio activo.
  if (user && user.tenantSlug) {
    return await getTenantBySlug(env, user.tenantSlug);
  }
  // Solo usuarios SIN colegio asignado: fallback al unico colegio activo (fase mono-establecimiento).
  // Con varios colegios este fallback no aplica (LIMIT 2 detecta "exactamente uno").
  try {
    const all = await env.DB.prepare(
      'SELECT id, slug, nombre, nombre_corto, rbd, comuna, localidad, region, branding_json FROM tenants WHERE activo = 1 LIMIT 2'
    ).all();
    const list = (all && all.results) || [];
    if (list.length === 1) return list[0];
  } catch (e) { /* ignore */ }
  return null;
}
