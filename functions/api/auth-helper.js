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

  // Si la sesion no tiene rol, obtenerlo desde KV del usuario
  if (!session.role) {
    const userData = await env.PACI_USERS.get(`user:${session.email}`);
    if (userData) {
      const user = JSON.parse(userData);
      session.role = user.role || 'teacher';
    } else {
      session.role = 'teacher';
    }
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
