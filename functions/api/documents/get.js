import { getUser } from '../auth-helper.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const body = await request.json();

    // Cargar un documento especifico o todos los de un estudiante
    if (body.documentId) {
      const doc = await env.DB.prepare(
        'SELECT * FROM documents WHERE id = ? AND user_email = ?'
      ).bind(body.documentId, user.email).first();

      if (!doc) return new Response(JSON.stringify({ ok: false, error: 'Documento no encontrado.' }), { status: 404, headers });

      return new Response(JSON.stringify({ ok: true, document: doc }), { status: 200, headers });
    }

    // Cargar todos los documentos de un estudiante (opcionalmente filtrados por trimestre)
    if (body.studentId) {
      let query = 'SELECT * FROM documents WHERE student_id = ? AND user_email = ?';
      const params = [body.studentId, user.email];

      if (body.trimester) {
        query += ' AND trimester = ?';
        params.push(body.trimester);
      }

      query += ' ORDER BY created_at ASC';

      const docs = await env.DB.prepare(query).bind(...params).all();

      // Tambien traer datos del estudiante
      const student = await env.DB.prepare(
        'SELECT * FROM students WHERE id = ? AND user_email = ?'
      ).bind(body.studentId, user.email).first();

      return new Response(JSON.stringify({
        ok: true,
        student,
        documents: docs.results || []
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: false, error: 'documentId o studentId requerido.' }), { status: 400, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor.' }), { status: 500, headers });
  }
}
