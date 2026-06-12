# Spec: Calendario escolar por colegio (multi-tenant Fase 2)

- **Estado:** Implementada (2026-06-12, commit 9348945)
- **Fecha:** 2026-06-12
- **Autor:** Carlos + Claude
- **Nota:** spec escrita retroactivamente como ejemplo del formato; la feature ya esta en produccion.

## Que se quiere y por que
El calendario escolar (fechas de los 3 trimestres, vacaciones, dias sin clases y eventos
del colegio) estaba escrito a mano dentro del codigo, con el nombre de la Escuela Luis
Cruz Martinez incrustado. Si se suma un segundo colegio, ese calendario seria incorrecto
para el. Se quiere que cada colegio tenga SU calendario, editable por el administrador,
y que toda la app (planificacion de clases, datepicker, widget del calendario) lo use.

## Criterios de aceptacion
- [x] El calendario vive en la base de datos, uno por colegio.
- [x] La app agenda clases saltando feriados, vacaciones y dias sin clases DEL colegio.
- [x] El admin puede editar trimestres, vacaciones y dias sin clases desde admin.html.
- [x] Si la red falla, la app sigue funcionando con un calendario de respaldo.
- [x] Los feriados nacionales de Chile siguen siendo genericos (no del colegio).

## Fuera de alcance
- Editor de eventos del colegio (actos, hitos) en admin.html — se conservan al guardar
  pero solo se editan via wrangler por ahora.
- Calendarios de anos futuros (2027+): se cargaran cuando exista la calendarizacion oficial.

## Plan tecnico (como se hizo)
1. Migracion 015: columna `tenants.calendario_json` + semilla LCM 2026 (aplicada a D1 antes del deploy).
2. `/api/tenant-config` devuelve `calendario`; tenant-helper incluye la columna.
3. app.html y dashboard.html: constantes como fallback + `aplicarCalendarioTenant()` que las
   muta con los datos del tenant (via `window.TENANT_CONFIG_READY`) y re-pinta el widget.
4. admin.html: editor simple (date inputs + textareas "fecha a fecha | nombre"); el backend
   valida fechas y hace merge preservando eventos.
5. Verificacion: ESLint limpio, endpoint probado en produccion.

## Resultado
Desplegado y verificado en produccion el 2026-06-12. Sin desvios respecto al plan;
el editor de eventos quedo explicitamente fuera de alcance.
