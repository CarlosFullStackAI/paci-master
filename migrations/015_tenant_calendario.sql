-- Fase 2 multi-tenant: calendario escolar por establecimiento.
-- Antes vivia hardcodeado en app.html y dashboard.html (FECHAS_TRIMESTRE,
-- FERIADOS, VACACIONES y eventos del colegio). Ahora cada tenant lo define
-- aqui y /api/tenant-config lo entrega al frontend. Los valores hardcodeados
-- quedan solo como fallback si la red falla.
ALTER TABLE tenants ADD COLUMN calendario_json TEXT DEFAULT '';

-- Semilla: calendarizacion oficial 2026 de la Escuela Luis Cruz Martinez (Pulebu),
-- copiada de las constantes que estaban en el codigo.
UPDATE tenants SET calendario_json = '{
  "ano": 2026,
  "trimestres": {
    "1er": { "inicio": "2026-03-04", "fin": "2026-06-05" },
    "2do": { "inicio": "2026-06-08", "fin": "2026-09-10" },
    "3er": { "inicio": "2026-09-14", "fin": "2026-12-11" }
  },
  "vacaciones": [
    { "inicio": "2026-06-22", "fin": "2026-07-03", "nombre": "Receso escolar de invierno" }
  ],
  "diasSinClases": {
    "2026-07-17": "Interferiado (sin clases)",
    "2026-08-14": "Jornada para la Reflexión Pedagógica DPD (sin clases)"
  },
  "eventos": [
    { "fecha": "2026-06-08", "titulo": "Inicio de clases 2° Trimestre", "tipo": "pie", "icon": "fa-school" },
    { "fecha": "2026-06-18", "titulo": "Acto Wetripantü (14:45 hrs)", "tipo": "efemeride", "icon": "fa-sun" },
    { "fecha": "2026-06-19", "titulo": "Convivencias por curso: Bienvenidas Vacaciones de Invierno", "tipo": "efemeride", "icon": "fa-people-group" },
    { "fecha": "2026-06-22", "titulo": "Inicio Receso Escolar de Invierno (hasta 03-jul)", "tipo": "feriado", "icon": "fa-snowflake" },
    { "fecha": "2026-07-17", "titulo": "Interferiado (sin clases)", "tipo": "feriado", "icon": "fa-flag" },
    { "fecha": "2026-08-14", "titulo": "Jornada para la Reflexión Pedagógica DPD", "tipo": "feriado", "icon": "fa-chalkboard-user" },
    { "fecha": "2026-09-02", "titulo": "Promedios en libros de clases 2° trimestre", "tipo": "pie", "icon": "fa-book" },
    { "fecha": "2026-09-04", "titulo": "Entrega Niveles de Aprendizaje", "tipo": "pie", "icon": "fa-chart-line" },
    { "fecha": "2026-09-07", "titulo": "Informes de notas (07 al 09 de septiembre)", "tipo": "pie", "icon": "fa-file-lines" },
    { "fecha": "2026-09-10", "titulo": "Término de clases 2° Trimestre", "tipo": "pie", "icon": "fa-flag-checkered" },
    { "fecha": "2026-09-14", "titulo": "Consejo de Evaluación y Planificación Curricular", "tipo": "pie", "icon": "fa-users" },
    { "fecha": "2026-09-16", "titulo": "Acto Fiestas Patrias (por confirmar)", "tipo": "efemeride", "icon": "fa-flag" }
  ]
}' WHERE slug = 'lcm-pulebu';
