export async function onRequestPost(context) {
  const { request, env } = context;

  // Secure solo en HTTPS (igual que al crear la cookie en login).
  const secure = new URL(request.url).protocol === 'https:' ? ' Secure;' : '';
  const clearCookie = `paci_session=; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=0`;

  try {
    // Obtener token de cookie o body
    const cookieStr = request.headers.get('Cookie') || '';
    let token = getCookieValue(cookieStr, 'paci_session');

    if (!token) {
      const body = await request.json().catch(() => ({}));
      token = body.token;
    }

    if (token) {
      await env.PACI_USERS.delete(`session:${token}`);
    }

    // Borrar la cookie httpOnly
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearCookie
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearCookie
      }
    });
  }
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
