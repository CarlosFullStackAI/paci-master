// Middleware global: bloquea el acceso publico a archivos internos del repo.
// Cloudflare Pages sube TODO el directorio del proyecto como sitio estatico,
// asi que sin esto el codigo fuente del backend (functions/*.js), las
// migraciones SQL, los specs y los archivos de configuracion quedan
// servidos publicamente (verificado: respondian 200).
// Corre en TODAS las requests (estaticas y /api/*); las no bloqueadas pasan.
import { getUserByToken } from './api/auth-helper.js';

const RUTAS_BLOQUEADAS = [
  /^\/functions\//i,                 // codigo fuente del backend
  /^\/migrations\//i,                // esquema de la base de datos
  /^\/specs\//i,                     // especificaciones internas
  /^\/scripts\//i,                   // herramientas de build
  /^\/archive\//i,                   // versiones legacy
  /^\/backups\//i,                   // snapshots locales
  /^\/CLAUDE\.md$/i,                 // instrucciones internas
  /^\/package(-lock)?\.json$/i,
  /^\/wrangler\.jsonc?$/i,
  /^\/\.eslintrc\.json$/i,
  /^\/tailwind\.config\.js$/i,
  /^\/input\.css$/i,
  /^\/\.gitignore$/i
];

// Documentacion tecnica interna: SOLO sesiones con rol admin (o la cuenta
// maestra) pueden verla; para cualquier otro responde 404 (no revela que existe).
const RUTA_DOC_TECNICA = /^\/documentacion-tecnica(\.html)?$/i;

function getCookieValue(cookieStr, name) {
  if (!cookieStr) return null;
  const prefix = name + '=';
  for (const cookie of cookieStr.split(';')) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefix)) return trimmed.substring(prefix.length);
  }
  return null;
}

function noEncontrado() {
  return new Response('No encontrado', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;

  if (RUTAS_BLOQUEADAS.some((re) => re.test(path))) {
    return noEncontrado();
  }

  if (RUTA_DOC_TECNICA.test(path)) {
    try {
      const token = getCookieValue(request.headers.get('Cookie') || '', 'paci_session');
      const user = token ? await getUserByToken(env, token) : null;
      const masterEmail = env.MASTER_ADMIN_EMAIL || 'carlos45335@gmail.com';
      const esAdmin = user && (user.role === 'admin' || user.email === masterEmail);
      if (!esAdmin) return noEncontrado();
    } catch (e) {
      return noEncontrado();
    }
  }

  return context.next();
}
