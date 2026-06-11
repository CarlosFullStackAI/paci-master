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

  // Rol y establecimiento se leen SIEMPRE frescos del perfil: si un admin
  // cambia el rol o el colegio de un usuario, aplica de inmediato y no
  // cuando expire la sesion (antes la sesion conservaba el rol 24h-7d).
  const userData = await env.PACI_USERS.get(`user:${session.email}`);
  if (userData) {
    const user = JSON.parse(userData);
    session.role = user.role || session.role || 'teacher';
    session.tenantSlug = user.tenantSlug !== undefined ? user.tenantSlug : (session.tenantSlug || '');
  } else {
    // Perfil inexistente (sesion huerfana): valores conservadores.
    if (!session.role) session.role = 'teacher';
    if (session.tenantSlug === undefined) session.tenantSlug = '';
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
