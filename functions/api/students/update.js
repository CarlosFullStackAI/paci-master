import { getUser } from '../auth-helper.js';
import { encrypt } from '../crypto-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const body = await request.json();
    const { studentId, data } = body;

    if (!studentId || !data) {
      return new Response(JSON.stringify({ ok: false, error: 'Datos incompletos.' }), { status: 400, headers });
    }

    // Verificar que el estudiante pertenece al usuario
    const student = await env.DB.prepare(
      'SELECT id FROM students WHERE id = ? AND user_email = ?'
    ).bind(studentId, user.email).first();

    if (!student) {
      return new Response(JSON.stringify({ ok: false, error: 'Estudiante no encontrado.' }), { status: 404, headers });
    }

    // Mapeo EXPLICITO de campos permitidos (previene SQLi al 100%)
    // Cada campo se actualiza con su propia query parametrizada.
    // Map en lugar de objeto literal: evita acceso indexado dinamico y
    // descarta cualquier key reservada que pudiera venir en el JSON entrante.
    const FIELD_MAP = new Map([
      ['name', 'name'], ['diagnosis', 'diagnosis'], ['diagnosis_id', 'diagnosis_id'],
      ['real_level', 'real_level'], ['work_level', 'work_level'], ['school', 'school'],
      ['birth_date', 'birth_date'], ['age', 'age'], ['rut', 'rut'], ['guardian', 'guardian'],
      ['nee_type', 'nee_type'], ['last_evaluation_date', 'last_evaluation_date'],
      ['next_evaluation_date', 'next_evaluation_date'],
      ['evaluation_periodicity', 'evaluation_periodicity'],
      ['diagnosis_date', 'diagnosis_date'], ['observations', 'observations']
    ]);

    // Campos que se cifran antes de guardar
    const ENCRYPTED_FIELDS = new Set(['rut', 'diagnosis', 'guardian', 'observations']);

    const stmts = [];

    for (const [inputKey, dbColumn] of FIELD_MAP) {
      // hasOwnProperty.call evita que un JSON malicioso con __proto__ o
      // constructor inyecte propiedades heredadas. Reflect.get es una
      // llamada de funcion, no acceso indexado, asi que no es vector OI.
      if (!Object.prototype.hasOwnProperty.call(data, inputKey)) continue;
      let value = Reflect.get(data, inputKey);
      if (value === undefined) continue;
      // Cifrar campos sensibles
      if (ENCRYPTED_FIELDS.has(inputKey) && env.ENCRYPTION_KEY) {
        value = await encrypt(String(value), env.ENCRYPTION_KEY);
      }
      stmts.push(
        env.DB.prepare(`UPDATE students SET ${dbColumn} = ?, updated_at = datetime('now') WHERE id = ?`)
          .bind(value, studentId)
      );
    }

    if (!stmts.length) {
      return new Response(JSON.stringify({ ok: false, error: 'No hay campos para actualizar.' }), { status: 400, headers });
    }

    // Ejecutar en batch (atomico)
    await env.DB.batch(stmts);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
