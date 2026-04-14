export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    // Intentar obtener token de: 1) cookie httpOnly, 2) body JSON
    let token = getCookieValue(request.headers.get('Cookie') || '', 'paci_session');

    if (!token) {
      const body = await request.json().catch(() => ({}));
      token = body.token;
    }

    if (!token) {
      return new Response(JSON.stringify({ ok: false }), { status: 401, headers });
    }

    const sessionData = await env.PACI_USERS.get(`session:${token}`);
    if (!sessionData) {
      return new Response(JSON.stringify({ ok: false }), { status: 401, headers });
    }

    const session = JSON.parse(sessionData);
    return new Response(JSON.stringify({
      ok: true,
      email: session.email,
      name: session.name
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers });
  }
}

function getCookieValue(cookieStr, name) {
  const match = cookieStr.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? match[1] : null;
}
