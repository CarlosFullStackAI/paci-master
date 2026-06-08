// POST /api/cron/check-fur-reminders
//
// Endpoint para chequear estudiantes con FUR (Formulario Unico de Reevaluacion)
// vencido o proximo y enviar correos a sus educadores. Pensado para ser disparado:
//   1. Manualmente desde el dashboard (boton "Enviar recordatorios FUR ahora")
//   2. Por un cron externo (cron-job.org, UpStash, etc.) que llame este endpoint
//      con el header X-Cron-Secret == env.CRON_SECRET
//
// Setup requerido:
//   - env.RESEND_API_KEY        (secreto, free tier 100 emails/dia en resend.com)
//   - env.FROM_EMAIL            (var, ej "alerts@piemaster.app" verificado en Resend)
//   - env.CRON_SECRET           (secreto, token aleatorio para auth del cron externo)
//   - env.PUBLIC_BASE_URL       (var, ej "https://proyecto-paci.pages.dev")
//
// Sin RESEND_API_KEY, el endpoint funciona en modo "dry-run": calcula y reporta
// que recordatorios habria enviado, pero sin mandar nada.

import { getUser } from '../auth-helper.js';

const WINDOW_DAYS_AHEAD = 30;    // recordatorio si FUR vence en <= 30 dias
const WINDOW_DAYS_OVERDUE = 60;  // o si vencio hace <= 60 dias
const DEDUP_DAYS = 14;           // no reenviar al mismo educador/estudiante en 14 dias

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  // Autenticacion: o cron externo via X-Cron-Secret, o usuario autenticado (manual)
  const cronSecret = request.headers.get('X-Cron-Secret');
  const isCron = env.CRON_SECRET && cronSecret === env.CRON_SECRET;
  let userEmailFilter = null;
  if (!isCron) {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });
    // Sin cron secret, solo procesa los estudiantes del propio usuario (modo manual desde dashboard)
    userEmailFilter = user.email;
  }

  try {
    // 1. Estudiantes con next_evaluation_date que cae dentro de la ventana
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const limiteAdelante = new Date(hoy); limiteAdelante.setDate(limiteAdelante.getDate() + WINDOW_DAYS_AHEAD);
    const limiteAtras = new Date(hoy); limiteAtras.setDate(limiteAtras.getDate() - WINDOW_DAYS_OVERDUE);

    const fmtSql = (d) => d.toISOString().slice(0, 10);

    let query = `
      SELECT id, user_email, name, next_evaluation_date, diagnosis, curso
      FROM students
      WHERE next_evaluation_date IS NOT NULL AND next_evaluation_date != ''
        AND date(next_evaluation_date) BETWEEN ? AND ?
    `;
    const binds = [fmtSql(limiteAtras), fmtSql(limiteAdelante)];
    if (userEmailFilter) { query += ' AND user_email = ?'; binds.push(userEmailFilter); }

    const rows = await env.DB.prepare(query).bind(...binds).all();
    const candidatos = rows.results || [];
    if (!candidatos.length) {
      return new Response(JSON.stringify({ ok: true, dryRun: !env.RESEND_API_KEY, candidatos: 0, sent: 0, skipped: 0 }), { headers });
    }

    // 2. Filtrar los ya recordados recientemente (dedup)
    const limiteDedup = new Date(); limiteDedup.setDate(limiteDedup.getDate() - DEDUP_DAYS);
    const limiteDedupSql = limiteDedup.toISOString();

    const recentRows = await env.DB.prepare(
      `SELECT student_id, user_email FROM fur_reminders_log WHERE sent_at >= ?`
    ).bind(limiteDedupSql).all();
    const recentSet = new Set((recentRows.results || []).map(r => r.user_email + '|' + r.student_id));

    const pendientes = candidatos.filter(c => !recentSet.has(c.user_email + '|' + c.id));

    if (!pendientes.length) {
      return new Response(JSON.stringify({ ok: true, candidatos: candidatos.length, sent: 0, skipped: candidatos.length, reason: 'Todos los candidatos ya fueron notificados en los últimos ' + DEDUP_DAYS + ' dias.' }), { headers });
    }

    // 3. Si no hay Resend key: modo dry-run (devolver la lista, no enviar)
    const dryRun = !env.RESEND_API_KEY;
    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true,
        dryRun: true,
        candidatos: candidatos.length,
        pendientes: pendientes.length,
        reminders: pendientes.map(p => ({
          student_id: p.id, name: p.name, user_email: p.user_email,
          due: p.next_evaluation_date, status: classify(p.next_evaluation_date, hoy)
        })),
        hint: 'Configura RESEND_API_KEY y FROM_EMAIL en Cloudflare para enviar emails reales.'
      }), { headers });
    }

    // 4. Agrupar por educador (un correo por usuario con todos sus FUR pendientes)
    const grupos = {};
    pendientes.forEach(p => {
      if (!grupos[p.user_email]) grupos[p.user_email] = [];
      grupos[p.user_email].push(p);
    });

    const fromEmail = env.FROM_EMAIL || 'PIE MASTER <onboarding@resend.dev>';
    const baseUrl = env.PUBLIC_BASE_URL || 'https://proyecto-paci.pages.dev';
    let totalSent = 0;
    const stmts = [];

    for (const [educadorEmail, studentList] of Object.entries(grupos)) {
      // Obtener el nombre del educador
      const eduRaw = await env.PACI_USERS.get(`user:${educadorEmail}`);
      let eduObj = {};
      try { eduObj = JSON.parse(eduRaw || '{}'); } catch (e) {}
      const eduName = eduObj.name || educadorEmail;

      // Construir email
      const itemsHtml = studentList.map(s => {
        const cls = classify(s.next_evaluation_date, hoy);
        const diffDays = Math.round((new Date(s.next_evaluation_date) - hoy) / (1000 * 60 * 60 * 24));
        const statusTxt = cls === 'overdue'
          ? '<span style="background:#fee2e2;color:#b91c1c;padding:3px 9px;border-radius:999px;font-weight:bold;font-size:12px;">VENCIDO hace ' + Math.abs(diffDays) + ' días</span>'
          : '<span style="background:#fef3c7;color:#92400e;padding:3px 9px;border-radius:999px;font-weight:bold;font-size:12px;">Vence en ' + diffDays + ' días</span>';
        const link = `${baseUrl}/docs.html?type=fur&student=${s.id}`;
        return `<tr>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;"><strong>${escapeHtml(s.name)}</strong>${s.curso ? '<br><span style="color:#64748b;font-size:12px;">' + escapeHtml(s.curso) + '</span>' : ''}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">${escapeHtml(s.diagnosis || '—')}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:13px;">${escapeHtml(s.next_evaluation_date)}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${statusTxt}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;"><a href="${link}" style="background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:12px;">Crear FUR</a></td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
<div style="background:linear-gradient(135deg,#091845,#1240c4);color:#fff;padding:24px 32px;">
<h1 style="font-size:20px;margin:0;font-weight:800;">PIE MASTER · Alerta FUR</h1>
<p style="margin:6px 0 0;font-size:14px;opacity:0.9;">Tienes ${studentList.length} estudiante${studentList.length === 1 ? '' : 's'} con reevaluación pendiente</p>
</div>
<div style="padding:24px 32px;">
<p style="font-size:14px;color:#334155;">Hola ${escapeHtml(eduName)},</p>
<p style="font-size:14px;color:#334155;">Según el Decreto 170/2009, estos estudiantes requieren <strong>Formulario Único de Reevaluación (FUR)</strong>. Te recordamos antes que MINEDUC fiscalice:</p>
<table style="width:100%;border-collapse:collapse;margin:18px 0;">
<thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:10px;font-size:11px;color:#64748b;text-transform:uppercase;">Estudiante</th><th style="text-align:left;padding:10px;font-size:11px;color:#64748b;text-transform:uppercase;">Diagnóstico</th><th style="text-align:left;padding:10px;font-size:11px;color:#64748b;text-transform:uppercase;">Vence</th><th style="text-align:left;padding:10px;font-size:11px;color:#64748b;text-transform:uppercase;">Estado</th><th></th></tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
<p style="font-size:13px;color:#64748b;margin-top:24px;">Puedes desactivar estos recordatorios en cualquier momento desde tu dashboard.</p>
</div>
<div style="background:#f8fafc;padding:16px 32px;font-size:11px;color:#94a3b8;text-align:center;">PIE MASTER — Plataforma de gestión documental PIE</div>
</div></body></html>`;

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: educadorEmail,
          subject: `PIE MASTER · ${studentList.length} estudiante${studentList.length === 1 ? '' : 's'} requiere FUR`,
          html
        })
      });

      if (resp.ok) {
        totalSent += studentList.length;
        // Log los enviados
        studentList.forEach(s => {
          stmts.push(env.DB.prepare(
            `INSERT INTO fur_reminders_log (user_email, student_id, due_date, status) VALUES (?, ?, ?, ?)`
          ).bind(educadorEmail, s.id, s.next_evaluation_date, classify(s.next_evaluation_date, hoy)));
        });
      }
    }

    if (stmts.length) await env.DB.batch(stmts);

    return new Response(JSON.stringify({ ok: true, candidatos: candidatos.length, sent: totalSent, skipped: candidatos.length - totalSent }), { headers });
  } catch (e) {
    console.error('Error en check-fur-reminders:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Error interno: ' + (e.message || 'desconocido') }), { status: 500, headers });
  }
}

function classify(dateStr, hoy) {
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return d < hoy ? 'overdue' : 'soon';
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
