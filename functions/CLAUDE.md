# Reglas para functions/ (Cloudflare Pages Functions)

- Son modulos ESM: `import`/`export` y handlers `onRequestGet` / `onRequestPost` (o `onRequest`
  con filtro de metodo si hay problemas de enrutamiento).
- TODO endpoint (salvo los publicos: tenants, tenant-config, google-config, weather) empieza con:
  `const user = await getUser(request, env);` y 401 si es null. Importar de `./auth-helper.js`
  o `../auth-helper.js` segun profundidad.
- Despues de auth: permisos con `checkPermission(user.role, 'accion')` de `rbac-helper.js`
  y aislamiento por colegio con `resolveTenant(request, env, user)` de `tenant-helper.js`
  (filtrar SIEMPRE por tenant_id en las queries).
- Campos sensibles de estudiantes (rut, diagnosis, guardian, observations) se cifran con
  `encrypt()` de `crypto-helper.js` ANTES de guardar y se descifran al leer.
- Solo prepared statements (`env.DB.prepare(...).bind(...)`); jamas concatenar SQL.
- Respuestas: JSON `{ ok: true/false, ... }`, mensajes de error en espanol, sin stack traces.
- Queries con GROUP BY que alimentan acciones del frontend deben exponer el id de la fila
  (ej. `MAX(id) as id`) — ver .claude/rules/lecciones-aprendidas.md.
- Para chequear sintaxis: copiar a un .mjs temporal y `node --check` (el package.json es commonjs).
