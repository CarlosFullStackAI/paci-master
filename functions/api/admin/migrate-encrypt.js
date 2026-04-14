import { getUser } from '../auth-helper.js';
import { encrypt } from '../crypto-helper.js';

// Endpoint de migracion: cifra datos existentes en texto plano
// Solo ejecutable por admin (primera cuenta registrada)
// POST /api/admin/migrate-encrypt
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    // Verificar que es admin (solo el primer usuario registrado o role=admin)
    const userData = await env.PACI_USERS.get(`user:${user.email}`);
    if (!userData) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 403, headers });
    const userObj = JSON.parse(userData);
    if (userObj.role !== 'admin' && user.email !== 'carlos.fullstack.ai@gmail.com') {
      return new Response(JSON.stringify({ ok: false, error: 'Solo administradores.' }), { status: 403, headers });
    }

    if (!env.ENCRYPTION_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'ENCRYPTION_KEY no configurada.' }), { status: 500, headers });
    }

    // Obtener todos los estudiantes
    const students = await env.DB.prepare('SELECT id, name, diagnosis, rut, guardian, observations FROM students').all();
    const rows = students.results || [];

    let migrated = 0;
    let skipped = 0;
    const stmts = [];

    for (const s of rows) {
      // Solo migrar campos que NO estan ya cifrados (no empiezan con "enc:")
      const updates = {};
      let needsUpdate = false;

      if (s.diagnosis && !s.diagnosis.startsWith('enc:')) {
        updates.diagnosis = await encrypt(s.diagnosis, env.ENCRYPTION_KEY);
        needsUpdate = true;
      }
      if (s.rut && !s.rut.startsWith('enc:')) {
        updates.rut = await encrypt(s.rut, env.ENCRYPTION_KEY);
        needsUpdate = true;
      }
      if (s.guardian && !s.guardian.startsWith('enc:')) {
        updates.guardian = await encrypt(s.guardian, env.ENCRYPTION_KEY);
        needsUpdate = true;
      }
      if (s.observations && !s.observations.startsWith('enc:')) {
        updates.observations = await encrypt(s.observations, env.ENCRYPTION_KEY);
        needsUpdate = true;
      }

      if (needsUpdate) {
        stmts.push(
          env.DB.prepare(
            `UPDATE students SET
              diagnosis = COALESCE(?, diagnosis),
              rut = COALESCE(?, rut),
              guardian = COALESCE(?, guardian),
              observations = COALESCE(?, observations),
              updated_at = datetime('now')
            WHERE id = ?`
          ).bind(
            updates.diagnosis || null,
            updates.rut || null,
            updates.guardian || null,
            updates.observations || null,
            s.id
          )
        );
        migrated++;
      } else {
        skipped++;
      }
    }

    // Ejecutar batch
    if (stmts.length > 0) {
      await env.DB.batch(stmts);
    }

    // Registrar en audit log
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    await env.DB.prepare(
      `INSERT INTO audit_logs (user_email, action, resource_type, resource_id, detail, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(user.email, 'ENCRYPT_MIGRATION', 'students', 0,
      `Migrated ${migrated} students, skipped ${skipped}`, ip
    ).run();

    return new Response(JSON.stringify({
      ok: true,
      migrated,
      skipped,
      total: rows.length,
      message: `Migracion completada: ${migrated} cifrados, ${skipped} ya estaban cifrados.`
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
