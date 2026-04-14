// Sistema centralizado de permisos RBAC
// Roles: admin, coordinator, teacher, educador_diferencial, profesor_asignatura, utp

const VALID_ROLES = ['admin', 'coordinator', 'teacher', 'educador_diferencial', 'profesor_asignatura', 'utp'];

// teacher y educador_diferencial comparten los mismos permisos
const FULL_CRUD_ROLES = ['admin', 'teacher', 'educador_diferencial'];
const READ_ALL_ROLES = ['admin', 'utp', 'coordinator'];
const COMMENT_ROLES = ['admin', 'teacher', 'educador_diferencial', 'profesor_asignatura', 'utp', 'coordinator'];
const APPROVE_ROLES = ['admin', 'utp'];
const MANAGE_STUDENTS_ROLES = ['admin', 'teacher', 'educador_diferencial'];

// Mapa de permisos por accion
const PERMISSIONS = {
  'paci:create': FULL_CRUD_ROLES,
  'paci:edit': FULL_CRUD_ROLES,
  'paci:delete': FULL_CRUD_ROLES,
  'paci:read': VALID_ROLES, // todos pueden leer (con filtros segun rol)
  'paci:comment': COMMENT_ROLES,
  'paci:approve': APPROVE_ROLES,
  'student:create': MANAGE_STUDENTS_ROLES,
  'student:edit': MANAGE_STUDENTS_ROLES,
  'student:delete': MANAGE_STUDENTS_ROLES,
  'student:read': VALID_ROLES, // todos pueden leer estudiantes
  'admin:set-role': ['admin'],
  'admin:audit-logs': ['admin']
};

// Verificar si un rol tiene permiso para una accion
export function hasPermission(role, action) {
  const allowedRoles = PERMISSIONS[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role || 'teacher');
}

// Verificar permiso y retornar Response 403 si no tiene
export function checkPermission(role, action) {
  if (!hasPermission(role, action)) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'No tienes permisos para esta accion.'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null; // null = tiene permiso
}

// Verificar si un rol es valido
export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

// Obtener rol del usuario desde KV (con fallback a 'teacher')
export async function getUserRole(env, email) {
  const userData = await env.PACI_USERS.get(`user:${email}`);
  if (!userData) return 'teacher';
  const user = JSON.parse(userData);
  return user.role || 'teacher';
}

// Verificar si el rol puede ver todos los documentos o solo los propios
export function canReadAllDocuments(role) {
  return READ_ALL_ROLES.includes(role || 'teacher');
}

// Verificar si profesor_asignatura: solo ve documentos de su asignatura
export function isSubjectRestricted(role) {
  return role === 'profesor_asignatura';
}

export { VALID_ROLES, PERMISSIONS };
