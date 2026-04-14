# Proyecto PACI - Plan de Adecuacion Curricular Individual

## Descripcion
Aplicacion web para crear, gestionar e imprimir Planes de Adecuacion Curricular Individual (PACI) para estudiantes con necesidades educativas especiales. Desplegada en Cloudflare Pages con D1 y KV.

## Stack Tecnologico
- Frontend: HTML + JavaScript vanilla + Tailwind CSS 3
- Backend: Cloudflare Pages Functions (serverless)
- Base de datos: Cloudflare D1 (SQLite)
- Autenticacion: Cloudflare KV (PACI_USERS)
- Deploy: Cloudflare Pages (proyecto: proyecto-paci)
- Linting: ESLint con plugin de seguridad

## Comandos Principales
```bash
# Desarrollo - compilar CSS
npm run watch:css

# Build CSS para produccion
npm run build:css

# Seguridad - analisis estatico
npm run security:sast

# Seguridad - dependencias
npm run security:sca

# Seguridad - completo
npm run security:all

# Deploy (incluye security checks)
npm run deploy
```

## Estructura del Proyecto
```
/
├── app.html                 # Aplicacion principal (crear/editar PACI)
├── login.html               # Pagina de login
├── dashboard.html           # Dashboard de gestion
├── index.html               # Pagina de entrada/redirect
├── functions/api/           # Cloudflare Pages Functions (backend)
│   ├── auth-helper.js       # Helper de autenticacion
│   ├── crypto-helper.js     # Helper de criptografia
│   ├── login.js             # Endpoint de login
│   ├── register.js          # Endpoint de registro
│   ├── logout.js            # Endpoint de logout
│   ├── verify.js            # Verificacion de sesion
│   ├── change-password.js   # Cambio de contrasena
│   ├── forgot-password.js   # Recuperacion de contrasena
│   ├── students/            # CRUD de estudiantes
│   ├── documents/           # CRUD de documentos PACI
│   ├── admin/               # Funciones administrativas
│   └── audit-helper.js      # Helper de auditoria
├── oas-reales.js            # Objetivos de aprendizaje reales
├── migrations/              # Migraciones de D1
├── wrangler.jsonc           # Config de Cloudflare
└── _headers                 # Headers de seguridad
```

## Convenciones de Codigo
- Indentacion: 2 espacios
- Strings: comillas simples en JS
- Nombres de variables: camelCase
- Nombres de archivos: kebab-case
- Funciones API: exportar onRequestGET, onRequestPOST, etc.
- Validar toda entrada de usuario en cada endpoint
- UI/UX: textos en espanol

## Reglas Especificas
- NUNCA hardcodear tokens, API keys o credenciales en el codigo
- Usar bindings de Cloudflare (env.DB, env.PACI_USERS) para acceder a servicios
- Toda entrada de usuario debe sanitizarse contra XSS y SQL injection
- Los endpoints deben verificar autenticacion via auth-helper.js
- No hacer deploy sin confirmacion explicita de Carlos
- Mantener compatibilidad con el formato oficial de PACI del MINEDUC

## Notas Importantes
- La base de datos D1 se llama "paci-db"
- El KV namespace para usuarios es "PACI_USERS"
- Los OA (Objetivos de Aprendizaje) reales estan en oas-reales.js
- El proyecto esta en Cloudflare Pages como "proyecto-paci"
- Los archivos *_raw.txt contienen OA parseados por asignatura
