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

  return JSON.parse(sessionData);
}

function getCookieValue(cookieStr, name) {
  const match = cookieStr.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? match[1] : null;
}
