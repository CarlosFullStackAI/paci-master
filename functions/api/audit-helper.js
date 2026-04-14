// Registrar acciones sensibles en audit_logs
export async function logAudit(env, request, user, action, resourceType, resourceId, detail) {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    // NUNCA guardar datos sensibles en el log, solo la accion y el ID
    await env.DB.prepare(
      `INSERT INTO audit_logs (user_email, action, resource_type, resource_id, detail, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(user.email, action, resourceType, resourceId || 0, detail || '', ip).run();
  } catch (e) {
    // El logging no debe romper la operacion principal
  }
}

// Enmascarar nombre: "Hector Pablo Diaz Vega" → "H. Diaz V."
export function maskName(fullName) {
  if (!fullName) return '-';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0] + '.';
  if (parts.length === 2) return parts[0][0] + '. ' + parts[1];
  // Asumimos: Nombre1 Nombre2 Apellido1 Apellido2
  const firstName = parts[0];
  const lastName1 = parts.length >= 3 ? parts[parts.length - 2] : parts[1];
  const lastName2 = parts.length >= 4 ? parts[parts.length - 1] : '';
  return firstName[0] + '. ' + lastName1 + (lastName2 ? ' ' + lastName2[0] + '.' : '');
}

// Enmascarar RUT: "23.497.717-2" → "23.***.**7-2"
export function maskRut(rut) {
  if (!rut || rut.length < 5) return '***';
  const clean = rut.replace(/[.-]/g, '');
  return clean.slice(0, 2) + '.' + '***' + '.**' + clean.slice(-2, -1) + '-' + clean.slice(-1);
}

// Enmascarar diagnostico: "NEEP: Discapacidad Intelectual Leve" → "NEEP: D.I.L."
export function maskDiagnosis(diag) {
  if (!diag) return '-';
  // Mantener el tipo (NEET/NEEP) pero abreviar el resto
  const match = diag.match(/^(NEET|NEEP):\s*(.+)/i);
  if (match) {
    const words = match[2].split(/\s+/);
    const abbr = words.map(w => w[0] + '.').join('');
    return match[1] + ': ' + abbr;
  }
  return diag.split(/\s+/).map(w => w[0] + '.').join('');
}

// Determinar rol del usuario desde KV
export async function getUserRole(env, email) {
  const userData = await env.PACI_USERS.get(`user:${email}`);
  if (!userData) return 'teacher';
  const user = JSON.parse(userData);
  return user.role || 'teacher';
}
