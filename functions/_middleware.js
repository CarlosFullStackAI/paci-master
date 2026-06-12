// Middleware global: bloquea el acceso publico a archivos internos del repo.
// Cloudflare Pages sube TODO el directorio del proyecto como sitio estatico,
// asi que sin esto el codigo fuente del backend (functions/*.js), las
// migraciones SQL, los specs y los archivos de configuracion quedan
// servidos publicamente (verificado: respondian 200).
// Corre en TODAS las requests (estaticas y /api/*); las no bloqueadas pasan.

const RUTAS_BLOQUEADAS = [
  /^\/functions\//i,                 // codigo fuente del backend
  /^\/migrations\//i,                // esquema de la base de datos
  /^\/specs\//i,                     // especificaciones internas
  /^\/scripts\//i,                   // herramientas de build
  /^\/archive\//i,                   // versiones legacy
  /^\/backups\//i,                   // snapshots locales
  /^\/CLAUDE\.md$/i,                 // instrucciones internas
  /^\/documentacion-tecnica\.html$/i, // doc tecnica: solo en el repo
  /^\/package(-lock)?\.json$/i,
  /^\/wrangler\.jsonc?$/i,
  /^\/\.eslintrc\.json$/i,
  /^\/tailwind\.config\.js$/i,
  /^\/input\.css$/i,
  /^\/\.gitignore$/i
];

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (RUTAS_BLOQUEADAS.some((re) => re.test(path))) {
    return new Response('No encontrado', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
  return context.next();
}
