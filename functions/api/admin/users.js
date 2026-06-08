import { getUser } from '../auth-helper.js';
import { checkPermission } from '../rbac-helper.js';
import { getTenantBySlug } from '../tenant-helper.js';

// Gestion de usuarios y su establecimiento. Solo admin o cuenta maestra.
// GET  /api/admin/users                              -> lista usuarios (email, name, role, tenantSlug)
// POST /api/admin/users { action:'set-tenant', email, tenantSlug }   -> asigna colegio a un usuario ('' = sin colegio)
// POST /api/admin/users { action:'assign-missing', tenantSlug }      -> asigna ese colegio a TODOS los usuarios sin colegio
export async function onRequest(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const masterEmail = env.MASTER_ADMIN_EMAIL || 'carlos45335@gmail.com';
    const denied = checkPermission(user.role, 'admin:users');
    if (denied && user.email !== masterEmail) return denied;

    const bad = (error, status = 400) => new Response(JSON.stringify({ ok: false, error }), { status, headers });

    if (request.method === 'GET') {
      const users = [];
      let cursor;
      do {
        const res = await env.PACI_USERS.list({ prefix: 'user:', cursor });
        for (const k of res.keys) {
          const raw = await env.PACI_USERS.get(k.name);
          if (!raw) continue;
          let u; try { u = JSON.parse(raw); } catch (e) { continue; }
          users.push({
            email: u.email || k.name.slice(5),
            name: u.name || '',
            role: u.role || 'teacher',
            tenantSlug: u.tenantSlug || ''
          });
        }
        cursor = res.list_complete ? null : res.cursor;
      } while (cursor);
      users.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
      return new Response(JSON.stringify({ ok: true, users }), { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const action = body.action;

      if (action === 'set-tenant') {
        const email = String(body.email || '').trim();
        const tenantSlug = String(body.tenantSlug || '').trim();
        if (!email) return bad('email requerido.');
        if (tenantSlug) {
          const t = await getTenantBySlug(env, tenantSlug);
          if (!t) return bad('El colegio indicado no existe o no esta activo.');
        }
        const raw = await env.PACI_USERS.get(`user:${email}`);
        if (!raw) return bad('Usuario no encontrado.', 404);
        const u = JSON.parse(raw);
        u.tenantSlug = tenantSlug; // '' = sin colegio
        u.updatedAt = new Date().toISOString();
        await env.PACI_USERS.put(`user:${email}`, JSON.stringify(u));
        return new Response(JSON.stringify({ ok: true, message: `Colegio de ${email} actualizado.` }), { headers });
      }

      if (action === 'assign-missing') {
        const tenantSlug = String(body.tenantSlug || '').trim();
        const t = await getTenantBySlug(env, tenantSlug);
        if (!t) return bad('El colegio indicado no existe o no esta activo.');
        let updated = 0;
        let cursor;
        do {
          const res = await env.PACI_USERS.list({ prefix: 'user:', cursor });
          for (const k of res.keys) {
            const raw = await env.PACI_USERS.get(k.name);
            if (!raw) continue;
            let u; try { u = JSON.parse(raw); } catch (e) { continue; }
            if (!u.tenantSlug) {
              u.tenantSlug = tenantSlug;
              u.updatedAt = new Date().toISOString();
              await env.PACI_USERS.put(k.name, JSON.stringify(u));
              updated += 1;
            }
          }
          cursor = res.list_complete ? null : res.cursor;
        } while (cursor);
        return new Response(JSON.stringify({ ok: true, message: `${updated} usuario(s) sin colegio asignados a ${t.nombre}.`, updated }), { headers });
      }

      return bad('Accion invalida. Usa "set-tenant" o "assign-missing".');
    }

    return new Response(JSON.stringify({ ok: false, error: 'Metodo no permitido.' }), { status: 405, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno.' }), { status: 500, headers });
  }
}
