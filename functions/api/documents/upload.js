import { getUser, getUserByToken } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';

// POST /api/documents/upload  (multipart/form-data)
// Sube un documento PIE ya listo (PDF/Word/imagen) y lo registra en el
// checklist del estudiante como documento de tipo `docType`.
// Campos del form: file, studentId, docType, _token (fallback si no hay cookie).
// El binario se guarda en KV (binding PACI_FILES) y la fila en `documents`
// lleva file_key/file_name/file_mime para servirlo via /api/documents/file.

const MAX_SIZE = 8 * 1024 * 1024; // 8MB (KV permite 25MB; margen para el tier free de 1GB)
const ALLOWED = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png'
};
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const form = await request.formData();

    // Auth: cookie httpOnly (via getUser) o campo _token del form.
    let user = await getUser(request, env);
    if (!user) user = await getUserByToken(env, form.get('_token'));
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const tenant = await resolveTenant(request, env, user);
    if (!tenant) return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers });

    const studentId = parseInt(form.get('studentId'), 10);
    const docType = String(form.get('docType') || '').trim().toLowerCase();
    const file = form.get('file');

    if (!studentId || !docType || !/^[a-z0-9_]{2,40}$/.test(docType)) {
      return new Response(JSON.stringify({ ok: false, error: 'studentId y docType validos son requeridos.' }), { status: 400, headers });
    }
    if (!file || typeof file === 'string' || !file.size) {
      return new Response(JSON.stringify({ ok: false, error: 'Archivo requerido.' }), { status: 400, headers });
    }
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ ok: false, error: 'El archivo supera el maximo de 8 MB.' }), { status: 400, headers });
    }

    const fileName = String(file.name || 'documento').replace(/[\\/:*?"<>|]/g, '').slice(0, 120) || 'documento';
    const ext = (fileName.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
    const mime = ALLOWED[file.type] ? file.type : null;
    if (!mime && !ALLOWED_EXT.includes(ext)) {
      return new Response(JSON.stringify({ ok: false, error: 'Tipo de archivo no permitido. Usa PDF, Word (.doc/.docx) o imagen (JPG/PNG).' }), { status: 400, headers });
    }

    // El estudiante debe pertenecer al establecimiento del usuario.
    const student = await env.DB.prepare(
      'SELECT id, name FROM students WHERE id = ? AND tenant_id = ?'
    ).bind(studentId, tenant.id).first();
    if (!student) return new Response(JSON.stringify({ ok: false, error: 'Estudiante no encontrado.' }), { status: 404, headers });

    // Guardar binario en KV.
    const fileKey = 'file:' + tenant.id + ':' + studentId + ':' + Date.now() + ':' + crypto.randomUUID().slice(0, 8);
    const buffer = await file.arrayBuffer();
    await env.PACI_FILES.put(fileKey, buffer, {
      metadata: { name: fileName, mime: mime || 'application/octet-stream', size: file.size }
    });

    // Registrar en documents para que el checklist lo cuente como existente.
    const docJson = JSON.stringify({
      uploaded: true,
      fileName,
      size: file.size,
      student: { name: student.name }
    });
    const res = await env.DB.prepare(
      `INSERT INTO documents (user_email, student_id, tenant_id, trimester, plan_type, document_json, file_key, file_name, file_mime)
       VALUES (?, ?, ?, '', ?, ?, ?, ?, ?)`
    ).bind(user.email, studentId, tenant.id, docType, docJson, fileKey, fileName, mime || 'application/octet-stream').run();

    return new Response(JSON.stringify({
      ok: true,
      documentId: res.meta && res.meta.last_row_id,
      fileName
    }), { status: 200, headers });

  } catch (e) {
    console.error('Error en documents/upload:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Error al subir el archivo. Intenta de nuevo.' }), { status: 500, headers });
  }
}
