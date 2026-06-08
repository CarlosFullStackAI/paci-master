import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';
import { encrypt } from '../crypto-helper.js';
import { checkPermission } from '../rbac-helper.js';

// POST /api/students/bulk-create
// Body: { students: [{ name, rut?, curso?, diagnosis?, real_level?, work_level?, birth_date?, age?, guardian?, school? }, ...] }
// Crea en lote evitando duplicados por (user_email + name). Devuelve resumen.
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const denied = checkPermission(user.role, 'student:edit');
    if (denied) return denied;

    const tenant = await resolveTenant(request, env, user);
    if (!tenant) return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers });
    const tenantId = tenant.id;

    const body = await request.json();
    const incoming = Array.isArray(body.students) ? body.students : [];
    if (!incoming.length) {
      return new Response(JSON.stringify({ ok: false, error: 'Lista vacia.' }), { status: 400, headers });
    }
    if (incoming.length > 500) {
      return new Response(JSON.stringify({ ok: false, error: 'Maximo 500 estudiantes por importacion.' }), { status: 400, headers });
    }

    // Filtrar invalidos (sin nombre)
    const cleaned = incoming
      .map(s => sanitize(s))
      .filter(s => s.name && s.name.length > 1);
    if (!cleaned.length) {
      return new Response(JSON.stringify({ ok: false, error: 'Ninguna fila valida (todas sin nombre).' }), { status: 400, headers });
    }

    // Cargar nombres existentes del establecimiento para dedup (compartido por colegio)
    const existingRows = await env.DB.prepare(
      'SELECT name FROM students WHERE tenant_id = ?'
    ).bind(tenantId).all();
    const existing = new Set((existingRows.results || []).map(r => normalizeName(r.name)));

    const toInsert = [];
    const skipped = [];

    for (const s of cleaned) {
      const norm = normalizeName(s.name);
      if (existing.has(norm)) { skipped.push({ name: s.name, reason: 'duplicado en tu base' }); continue; }
      existing.add(norm); // evita duplicados dentro del propio CSV
      toInsert.push(s);
    }

    if (!toInsert.length) {
      return new Response(JSON.stringify({
        ok: true, inserted: 0, skipped, message: 'Todos los nombres ya existian en tu base.'
      }), { headers });
    }

    // Cifrar campos sensibles y armar batch
    const stmts = [];
    for (const s of toInsert) {
      const encDiag = (env.ENCRYPTION_KEY && s.diagnosis)
        ? await encrypt(s.diagnosis, env.ENCRYPTION_KEY)
        : (s.diagnosis || '');
      const encRut = (env.ENCRYPTION_KEY && s.rut)
        ? await encrypt(s.rut, env.ENCRYPTION_KEY)
        : (s.rut || '');
      const encGuard = (env.ENCRYPTION_KEY && s.guardian)
        ? await encrypt(s.guardian, env.ENCRYPTION_KEY)
        : (s.guardian || '');

      stmts.push(env.DB.prepare(
        `INSERT INTO students
          (user_email, name, diagnosis, diagnosis_id, real_level, work_level,
           school, birth_date, age, rut, guardian, curso, profile_json, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        user.email, s.name, encDiag, '',
        s.real_level || '', s.work_level || '',
        s.school || '', s.birth_date || '', s.age || 0,
        encRut, encGuard, s.curso || '', s.profile_json || '', tenantId
      ));
    }

    await env.DB.batch(stmts);

    return new Response(JSON.stringify({
      ok: true,
      inserted: toInsert.length,
      skipped,
      message: `${toInsert.length} estudiante(s) importado(s)` + (skipped.length ? `, ${skipped.length} omitido(s)` : '')
    }), { status: 201, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno.' }), { status: 500, headers });
  }
}

// Limpieza basica de cada fila
function sanitize(s) {
  const out = {};
  out.name        = String(s.name || '').slice(0, 120).trim();
  out.rut         = String(s.rut || '').slice(0, 20).trim();
  out.curso       = String(s.curso || '').slice(0, 60).trim();
  out.diagnosis   = String(s.diagnosis || '').slice(0, 240).trim();
  out.real_level  = String(s.real_level || '').slice(0, 20).trim();
  out.work_level  = String(s.work_level || '').slice(0, 20).trim();
  out.birth_date  = String(s.birth_date || '').slice(0, 12).trim();
  out.age         = parseInt(s.age) || 0;
  out.guardian    = String(s.guardian || '').slice(0, 120).trim();
  out.school      = String(s.school || '').slice(0, 120).trim();
  return out;
}

function normalizeName(n) {
  return String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
