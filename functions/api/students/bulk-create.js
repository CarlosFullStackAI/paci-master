import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';
import { encrypt } from '../crypto-helper.js';
import { checkPermission } from '../rbac-helper.js';
import { logAudit } from '../audit-helper.js';

// POST /api/students/bulk-create
// Body: { students: [{ name, rut?, curso?, diagnosis?, diagnosis_id?, nee_type?,
//                      diagnosis_date?, real_level?, work_level?, birth_date?, age?,
//                      guardian?, apoderado_rut?, school? }, ...],
//         mode?: 'create' | 'upsert' }
// mode 'create' (default): crea en lote evitando duplicados por nombre.
// mode 'upsert': ademas ACTUALIZA los que ya existen (solo los campos que vienen
// con valor; los vacios no pisan datos). Los campos sensibles (rut, diagnosis,
// guardian) se cifran SIEMPRE server-side; apoderado_rut viaja al profile_json
// (mismo lugar que usa el prefill de docs.html).
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

    const upsert = body.mode === 'upsert';

    // Cargar estudiantes existentes del establecimiento (nombre -> fila) para
    // dedup en modo create y para actualizar en modo upsert.
    const existingRows = await env.DB.prepare(
      'SELECT id, name, profile_json FROM students WHERE tenant_id = ?'
    ).bind(tenantId).all();
    const existingByName = new Map(
      (existingRows.results || []).map(r => [normalizeName(r.name), r])
    );

    const toInsert = [];
    const toUpdate = [];
    const skipped = [];
    const vistos = new Set();

    for (const s of cleaned) {
      const norm = normalizeName(s.name);
      if (vistos.has(norm)) { skipped.push({ name: s.name, reason: 'repetido dentro del CSV' }); continue; }
      vistos.add(norm);
      const row = existingByName.get(norm);
      if (row) {
        if (upsert) toUpdate.push({ s, row });
        else skipped.push({ name: s.name, reason: 'duplicado en tu base' });
      } else {
        toInsert.push(s);
      }
    }

    if (!toInsert.length && !toUpdate.length) {
      // Trampa frecuente: importar un CSV de ACTUALIZACION sin marcar el modo
      // upsert deja todo en "duplicado" y parece exito. Decirlo explicito.
      const hint = !upsert
        ? ' ¿Querias ACTUALIZAR sus datos? Marca la casilla "Actualizar existentes" e importa de nuevo.'
        : '';
      return new Response(JSON.stringify({
        ok: true, inserted: 0, updated: 0, skipped,
        message: 'No se guardo nada: todos los nombres ya existian en tu base.' + hint
      }), { headers });
    }

    // Cifra un campo sensible si hay llave y valor (nunca persiste sensibles en claro).
    const enc = async (v) => (env.ENCRYPTION_KEY && v) ? await encrypt(v, env.ENCRYPTION_KEY) : (v || '');

    const stmts = [];

    for (const s of toInsert) {
      const profile = s.apoderado_rut ? JSON.stringify({ apoderado_rut: s.apoderado_rut }) : '';
      stmts.push(env.DB.prepare(
        `INSERT INTO students
          (user_email, name, diagnosis, diagnosis_id, nee_type, diagnosis_date,
           real_level, work_level, school, birth_date, age, rut, guardian, curso,
           profile_json, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        user.email, s.name, await enc(s.diagnosis), s.diagnosis_id || '',
        s.nee_type || '', s.diagnosis_date || '',
        s.real_level || '', s.work_level || '',
        s.school || '', s.birth_date || '', s.age || 0,
        await enc(s.rut), await enc(s.guardian), s.curso || '', profile, tenantId
      ));
    }

    // Upsert: actualizar SOLO los campos que traen valor (vacio = conservar lo actual).
    for (const { s, row } of toUpdate) {
      const sets = [];
      const binds = [];
      const set = (col, val) => { sets.push(col + ' = ?'); binds.push(val); };

      if (s.rut)            set('rut', await enc(s.rut));
      if (s.diagnosis)      set('diagnosis', await enc(s.diagnosis));
      if (s.guardian)       set('guardian', await enc(s.guardian));
      if (s.diagnosis_id)   set('diagnosis_id', s.diagnosis_id);
      if (s.nee_type)       set('nee_type', s.nee_type);
      if (s.diagnosis_date) set('diagnosis_date', s.diagnosis_date);
      if (s.curso)          set('curso', s.curso);
      if (s.real_level)     set('real_level', s.real_level);
      if (s.work_level)     set('work_level', s.work_level);
      if (s.birth_date)     set('birth_date', s.birth_date);
      if (s.school)         set('school', s.school);
      if (s.age)            set('age', s.age);
      if (s.apoderado_rut) {
        let profile = {};
        try { profile = row.profile_json ? JSON.parse(row.profile_json) : {}; } catch (e) { profile = {}; }
        if (typeof profile !== 'object' || Array.isArray(profile) || !profile) profile = {};
        profile.apoderado_rut = s.apoderado_rut;
        set('profile_json', JSON.stringify(profile));
      }

      if (!sets.length) { skipped.push({ name: s.name, reason: 'sin campos con valor para actualizar' }); continue; }
      sets.push("updated_at = datetime('now')");
      binds.push(row.id, tenantId);
      stmts.push(env.DB.prepare(
        `UPDATE students SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`
      ).bind(...binds));
    }

    if (stmts.length) await env.DB.batch(stmts);

    const updatedCount = toUpdate.filter(u => !skipped.some(k => k.name === u.s.name)).length;

    // Audit: importacion masiva (sin datos sensibles en el log)
    await logAudit(env, request, user, upsert ? 'BULK_UPSERT_STUDENTS' : 'BULK_CREATE_STUDENTS', 'students', 0,
      `Imported ${toInsert.length}, updated ${updatedCount}, skipped ${skipped.length}`);

    return new Response(JSON.stringify({
      ok: true,
      inserted: toInsert.length,
      updated: updatedCount,
      skipped,
      message: `${toInsert.length} estudiante(s) creado(s), ${updatedCount} actualizado(s)` + (skipped.length ? `, ${skipped.length} omitido(s)` : '')
    }), { status: 201, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno.' }), { status: 500, headers });
  }
}

// Limpieza basica de cada fila
function sanitize(s) {
  const out = {};
  out.name           = String(s.name || '').slice(0, 120).trim();
  out.rut            = String(s.rut || '').slice(0, 20).trim();
  out.curso          = String(s.curso || '').slice(0, 60).trim();
  out.diagnosis      = String(s.diagnosis || '').slice(0, 240).trim();
  out.diagnosis_id   = String(s.diagnosis_id || '').slice(0, 30).trim().toLowerCase();
  out.nee_type       = String(s.nee_type || '').slice(0, 10).trim().toUpperCase();
  out.diagnosis_date = String(s.diagnosis_date || '').slice(0, 12).trim();
  out.real_level     = String(s.real_level || '').slice(0, 20).trim();
  out.work_level     = String(s.work_level || '').slice(0, 20).trim();
  out.birth_date     = String(s.birth_date || '').slice(0, 12).trim();
  out.age            = parseInt(s.age) || 0;
  out.guardian       = String(s.guardian || '').slice(0, 120).trim();
  out.apoderado_rut  = String(s.apoderado_rut || '').slice(0, 20).trim();
  out.school         = String(s.school || '').slice(0, 120).trim();
  return out;
}

function normalizeName(n) {
  return String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
