# /data/tenants — Datos por establecimiento educacional

Cada subcarpeta corresponde a un establecimiento que usa el sistema PACI.

## Estructura del tenant

```
tenants/
└── <slug>/
    ├── config.json      # Datos del establecimiento (RBD, comuna, region, etc.)
    ├── logos/           # Logos institucionales (PNG/SVG)
    └── staff/           # Documentos del personal
```

## Establecimientos actuales

- **`lcm-pulebu/`** — Escuela Luis Cruz Martinez, Pulebu, Region del Biobio.

## Como agregar un nuevo establecimiento

1. **Elegir slug**: kebab-case lowercase, descriptivo. Ej. `lcm-pulebu`, `liceo-bicentenario-lota`.
2. **Copiar template**: `cp -r data/tenants/lcm-pulebu data/tenants/<nuevo-slug>`.
3. **Editar `config.json`** con los datos del nuevo establecimiento (RBD, dirección, comuna, region, etc.).
4. **Reemplazar logos** en `logos/` con los del nuevo colegio.
5. **Reemplazar staff** en `staff/` con los documentos del personal del nuevo colegio.
6. **(Pendiente Fase 2)** Activar el tenant en la app:
   - Hoy `app.html:1115` y `login.html:328` tienen el nombre hardcoded de "Escuela Luis Cruz Martinez".
   - Refactor pendiente: leer nombre, logos, footer desde `config.json` segun el tenant del usuario logueado.

## Privacidad

Los archivos en `staff/` pueden contener nombres y datos del personal docente. Por defecto los `*.docx` estan ignorados de git via `.gitignore`. Si se versiona, evaluar consentimiento.
