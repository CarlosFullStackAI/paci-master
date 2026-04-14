export async function onRequestPost(context) {
  const headers = { 'Content-Type': 'application/json' };

  // Por seguridad, siempre responde igual (no revelar si el correo existe)
  // TODO: Integrar con servicio de email (Resend, Mailgun, etc.) para enviar
  // correo real de recuperacion. Por ahora solo muestra mensaje generico.
  return new Response(JSON.stringify({
    ok: true,
    message: 'Si el correo esta registrado, recibiras instrucciones para recuperar tu contrasena.'
  }), { status: 200, headers });
}
