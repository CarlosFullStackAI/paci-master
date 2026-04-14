import { getUser } from '../auth-helper.js';
import { checkPermission } from '../rbac-helper.js';
import { logAudit } from '../audit-helper.js';

// GET (via POST) - Listar comentarios de un documento
// POST - Agregar comentario a un documento
// { action: 'list', documentId } o { action: 'add', documentId, text }
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const body = await request.json();
    const { action, documentId, text } = body;

    if (!documentId) {
      return new Response(JSON.stringify({ ok: false, error: 'documentId requerido.' }), { status: 400, headers });
    }

    // Verificar que el documento existe
    const doc = await env.DB.prepare(
      'SELECT id, user_email FROM documents WHERE id = ?'
    ).bind(documentId).first();

    if (!doc) {
      return new Response(JSON.stringify({ ok: false, error: 'Documento no encontrado.' }), { status: 404, headers });
    }

    if (action === 'list') {
      // Cualquier rol autenticado puede leer comentarios
      const denied = checkPermission(user.role, 'paci:read');
      if (denied) return denied;

      const comments = await env.DB.prepare(
        `SELECT id, user_email, user_role, comment_text, created_at
         FROM document_comments
         WHERE document_id = ?
         ORDER BY created_at ASC`
      ).bind(documentId).all();

      return new Response(JSON.stringify({
        ok: true,
        comments: comments.results || []
      }), { status: 200, headers });
    }

    if (action === 'add') {
      // Verificar permiso de comentar
      const denied = checkPermission(user.role, 'paci:comment');
      if (denied) return denied;

      if (!text || !text.trim()) {
        return new Response(JSON.stringify({ ok: false, error: 'El comentario no puede estar vacio.' }), { status: 400, headers });
      }

      // Sanitizar texto (prevenir XSS)
      const sanitizedText = text.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');

      await env.DB.prepare(
        `INSERT INTO document_comments (document_id, user_email, user_role, comment_text)
         VALUES (?, ?, ?, ?)`
      ).bind(documentId, user.email, user.role || 'teacher', sanitizedText).run();

      await logAudit(env, request, user, 'comment_add', 'document', documentId, `Comentario agregado por ${user.role}`);

      return new Response(JSON.stringify({
        ok: true,
        message: 'Comentario agregado.'
      }), { status: 201, headers });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion invalida. Usa "list" o "add".' }), { status: 400, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error al procesar comentarios: ' + e.message }), { status: 500, headers });
  }
}
