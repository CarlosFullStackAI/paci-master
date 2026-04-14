import { getUser } from '../auth-helper.js';

// Endpoint para asignar roles. Solo el admin puede usarlo.
// POST /api/admin/set-role { email, role }
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    // Solo admin o la cuenta maestra
    const callerData = await env.PACI_USERS.get(`user:${user.email}`);
    const caller = callerData ? JSON.parse(callerData) : {};
    if (caller.role !== 'admin' && user.email !== 'carlos.fullstack.ai@gmail.com') {
      return new Response(JSON.stringify({ ok: false, error: 'Solo administradores.' }), { status: 403, headers });
    }

    const { email, role } = await request.json();
    const VALID_ROLES = ['admin', 'coordinator', 'teacher'];

    if (!email || !role || !VALID_ROLES.includes(role)) {
      return new Response(JSON.stringify({ ok: false, error: 'Email y rol valido requeridos (admin, coordinator, teacher).' }), { status: 400, headers });
    }

    // Actualizar rol del usuario en KV
    const targetData = await env.PACI_USERS.get(`user:${email}`);
    if (!targetData) {
      return new Response(JSON.stringify({ ok: false, error: 'Usuario no encontrado.' }), { status: 404, headers });
    }

    const target = JSON.parse(targetData);
    target.role = role;
    await env.PACI_USERS.put(`user:${email}`, JSON.stringify(target));

    return new Response(JSON.stringify({ ok: true, message: `Rol de ${email} actualizado a ${role}.` }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
