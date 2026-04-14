import { getUser } from '../auth-helper.js';
import { getUserRole } from '../audit-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const role = await getUserRole(env, user.email);
    if (role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, error: 'Solo administradores.' }), { status: 403, headers });
    }

    const body = await request.json();
    const limit = Math.min(body.limit || 50, 200);
    const offset = body.offset || 0;

    const logs = await env.DB.prepare(`
      SELECT id, user_email, action, resource_type, resource_id, detail, ip_address, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const total = await env.DB.prepare('SELECT COUNT(*) as count FROM audit_logs').first();

    return new Response(JSON.stringify({
      ok: true,
      logs: logs.results || [],
      total: total ? total.count : 0
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
