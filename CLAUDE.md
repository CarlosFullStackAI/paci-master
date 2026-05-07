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
├── app.html                          # Aplicacion principal (crear/editar PACI)
├── login.html                        # Pagina de login
├── dashboard.html                    # Dashboard de gestion
├── index.html                        # Pagina de entrada/redirect
├── nee-templates.js                  # Templates de Necesidades Educativas Especiales
├── favicon.{png,svg}                 # Branding global
│
├── functions/api/                    # Cloudflare Pages Functions (backend)
│   ├── auth-helper.js
│   ├── crypto-helper.js
│   ├── login.js, register.js, logout.js, verify.js
│   ├── change-password.js, forgot-password.js
│   ├── generate-pdf.js               # PDF server-side via Browser Rendering
│   ├── students/                     # CRUD de estudiantes
│   ├── documents/                    # CRUD de documentos PACI
│   └── admin/
│
├── data/                             # Datos categorizados (multi-tenant ready)
│   ├── mineduc/                      # GENERICO (cualquier colegio chileno)
│   │   ├── oas/                      # OAs raw text + JS compilado
│   │   ├── bases-curriculares/       # PDFs Bases Curriculares MINEDUC
│   │   ├── normativa/                # Decretos, Leyes
│   │   ├── calendario-escolar/       # Calendarios oficiales por ano/region
│   │   ├── formato-paci.docx         # Formato oficial Decreto 83/2015
│   │   └── asignaturas.docx
│   └── tenants/                      # ESPECIFICO por establecimiento
│       └── lcm-pulebu/                # Escuela Luis Cruz Martinez (Pulebu)
│           ├── config.json           # Datos del colegio (RBD, comuna, etc.)
│           ├── logos/
│           └── staff/
│
├── scripts/                          # Build tools (NO runtime)
│   ├── build-oas.js                  # Compila *_raw.txt → oas-reales.js
│   ├── parse-oas.js
│   └── extract-oas.js                # Extrae texto desde PDFs
│
├── migrations/                       # D1 schema migrations
├── archive/                          # Versiones legacy (revisar antes de borrar)
├── backups/                          # Snapshots locales (gitignored)
│
├── package.json, wrangler.jsonc, _headers, tailwind.config.js, input.css
└── .gitignore, .eslintrc.json
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
- Los OA (Objetivos de Aprendizaje) estan inline en `app.html` como `OAS_REALES`. La fuente esta en `data/mineduc/oas/oas-reales.js` (output de `scripts/build-oas.js`).
- El proyecto esta en Cloudflare Pages como "proyecto-paci"
- Los archivos `data/mineduc/oas/*_raw.txt` contienen OA crudo extraido de los PDFs MINEDUC.
- PDF descarga: server-side via Cloudflare Browser Rendering en `functions/api/generate-pdf.js`.
- Multi-tenancy: estructura preparada en `data/tenants/`. Strings "Escuela Luis Cruz Martinez" siguen hardcoded en `app.html` y `login.html` — pendiente refactor Fase 2 para leer desde `config.json`.
