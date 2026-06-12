import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';
import { encrypt } from '../crypto-helper.js';
import { checkPermission } from '../rbac-helper.js';

// POST /api/students/create
// Crea UNA ficha de estudiante sin necesidad de un documento previo.
// Body: { data: { name (obligatorio), curso?, rut?, diagnosis?, diagnosis_date?,
//                 work_level?, real_level?, birth_date?, age?, guardian?, school? },
//         force? }  // force=true crea aunque el nombre ya exista en el colegio.
// Si el nombre ya existe y force no es true, responde { ok:false, duplicate:true }.
// Devuelve { ok:true, id } con el id del nuevo estudiante.
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
    const s = sanitize(body.data || {});
    const force = body.force === true;

    if (!s.name || s.name.length < 2) {
      return new Response(JSON.stringify({ ok: false, error: 'El nombre del estudiante es obligatorio.' }), { status: 400, headers });
    }

    // Dedup por nombre dentro del establecimiento (compartido por colegio).
    // No bloquea: si ya existe y no se forzo, avisa para que el usuario decida.
    if (!force) {
      const existingRows = await env.DB.prepare(
        'SELECT name FROM students WHERE tenant_id = ?'
      ).bind(tenantId).all();
      const norm = normalizeName(s.name);
      const dup = (existingRows.results || []).some(r => normalizeName(r.name) === norm);
      if (dup) {
        return new Response(JSON.stringify({
          ok: false,
          duplicate: true,
          error: `Ya existe un estudiante llamado "${s.name}" en tu establecimiento.`
        }), { status: 200, headers });
      }
    }

    // Cifrar campos sensibles antes de guardar
    const encDiag = (env.ENCRYPTION_KEY && s.diagnosis)
      ? await encrypt(s.diagnosis, env.ENCRYPTION_KEY)
      : (s.diagnosis || '');
    const encRut = (env.ENCRYPTION_KEY && s.rut)
      ? await encrypt(s.rut, env.ENCRYPTION_KEY)
      : (s.rut || '');
    const encGuard = (env.ENCRYPTION_KEY && s.guardian)
      ? await encrypt(s.guardian, env.ENCRYPTION_KEY)
      : (s.guardian || '');

    const result = await env.DB.prepare(
      `INSERT INTO students
        (user_email, name, diagnosis, diagnosis_id, real_level, work_level,
         school, birth_date, age, rut, guardian, curso, diagnosis_date, profile_json, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.email, s.name, encDiag, '',
      s.real_level || '', s.work_level || '',
      s.school || '', s.birth_date || '', s.age || 0,
      encRut, encGuard, s.curso || '', s.diagnosis_date || '', '', tenantId
    ).run();

    const newId = result && result.meta ? result.meta.last_row_id : null;

    return new Response(JSON.stringify({ ok: true, id: newId }), { status: 201, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}

// Limpieza basica de los campos entrantes
function sanitize(s) {
  return {
    name:           String(s.name || '').slice(0, 120).trim(),
    rut:            String(s.rut || '').slice(0, 20).trim(),
    curso:          String(s.curso || '').slice(0, 60).trim(),
    diagnosis:      String(s.diagnosis || '').slice(0, 240).trim(),
    diagnosis_date: String(s.diagnosis_date || '').slice(0, 12).trim(),
    real_level:     String(s.real_level || '').slice(0, 60).trim(),
    work_level:     String(s.work_level || '').slice(0, 20).trim(),
    birth_date:     String(s.birth_date || '').slice(0, 12).trim(),
    age:            parseInt(s.age) || 0,
    guardian:       String(s.guardian || '').slice(0, 120).trim(),
    school:         String(s.school || '').slice(0, 120).trim()
  };
}

function normalizeName(n) {
  return String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
