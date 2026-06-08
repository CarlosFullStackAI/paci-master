// Helper compartido para verificar sesion en las API
export async function getUser(request, env) {
  // 1. Intentar desde cookie httpOnly (mas seguro)
  const cookieStr = request.headers.get('Cookie') || '';
  let token = getCookieValue(cookieStr, 'paci_session');

  // 2. Fallback: token en el body JSON
  if (!token) {
    const body = await request.clone().json().catch(() => ({}));
    token = body._token;
  }

  if (!token) return null;

  const sessionData = await env.PACI_USERS.get(`session:${token}`);
  if (!sessionData) return null;

  const session = JSON.parse(sessionData);

  // Completar rol y establecimiento desde el perfil del usuario si la sesion
  // (puede ser una sesion vieja, creada antes de guardar estos campos) no los trae.
  if (!session.role || session.tenantSlug === undefined) {
    const userData = await env.PACI_USERS.get(`user:${session.email}`);
    const user = userData ? JSON.parse(userData) : {};
    if (!session.role) session.role = user.role || 'teacher';
    if (session.tenantSlug === undefined) session.tenantSlug = user.tenantSlug || '';
  }

  return session;
}

function getCookieValue(cookieStr, name) {
  if (!cookieStr) return null;
  const prefix = name + '=';
  for (const cookie of cookieStr.split(';')) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefix)) return trimmed.substring(prefix.length);
  }
  return null;
}
