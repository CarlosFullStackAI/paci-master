# /data — Datos del sistema PACI

Esta carpeta separa los datos en dos categorias para preparar al software para uso multi-tenant (varios establecimientos).

## Estructura

```
data/
├── mineduc/         # GENERICO - cualquier establecimiento educacional chileno
│   ├── oas/                     # Objetivos de Aprendizaje (textos raw + JS compilado)
│   ├── bases-curriculares/      # PDFs oficiales MINEDUC
│   ├── normativa/               # Decretos, Leyes, normativa internacional
│   ├── calendario-escolar/      # Calendarios oficiales por año/region
│   ├── formato-paci.docx        # Formato oficial del documento PACI
│   └── asignaturas.docx         # Lista de asignaturas MINEDUC
│
└── tenants/         # ESPECIFICO por establecimiento
    └── lcm-pulebu/              # Escuela Luis Cruz Martinez (Pulebu, Biobio)
        ├── config.json          # Datos del establecimiento (RBD, comuna, etc.)
        ├── logos/               # Logos institucionales
        └── staff/               # Documentos del personal docente
```

## Como agregar un nuevo establecimiento

1. Crear carpeta `data/tenants/<slug>/` con slug en kebab-case lowercase.
2. Copiar `data/tenants/lcm-pulebu/` como template.
3. Editar `config.json` con los datos del nuevo establecimiento.
4. Reemplazar logos y staff.
5. (Pendiente Fase 2) Configurar el tenant en la app: hoy los strings "Escuela Luis Cruz Martinez" estan hardcoded en `app.html` y `login.html`. Se requiere refactor para leer desde `config.json`.

## Importante

Los archivos `*.docx` con info de personal pueden contener datos sensibles. Por defecto estan ignorados de git via `.gitignore`. Si se quieren versionar, evaluar privacidad.

Los PDFs de `bases-curriculares/` y `normativa/` son publicos (MINEDUC) — sin problema de privacidad.
