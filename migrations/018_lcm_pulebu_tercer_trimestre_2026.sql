-- Calendarizacion 2026 de la Escuela Luis Cruz Martinez (Pulebu): ajuste del
-- 3er trimestre. La semana del 14 al 18 de septiembre es "cambio de actividades"
-- (Fiestas Patrias), asi que las clases del 3er trimestre parten el lunes
-- 21-sep y esa semana se recupera en diciembre: el trimestre termina el viernes
-- 18-dic (antes: 14-sep a 11-dic, seed de la migracion 015).
--
-- Solo toca inicio/fin del 3er trimestre y agrega 3 avisos al calendario del
-- equipo. Vacaciones, dias sin clases y eventos ya cargados quedan intactos
-- (json_set / json_insert editan el JSON existente, no lo reemplazan).
-- Fallbacks sincronizados en app.html (FECHAS_TRIMESTRE, in-fecha-fin) y
-- dashboard.html (FECHAS_TRIMESTRE).
UPDATE tenants
SET calendario_json = json_set(calendario_json,
      '$.trimestres.3er.inicio', '2026-09-21',
      '$.trimestres.3er.fin', '2026-12-18'),
    updated_at = datetime('now')
WHERE slug = 'lcm-pulebu' AND json_valid(calendario_json);

-- Avisos en el calendario del dashboard (idempotente: no duplica si ya existen).
UPDATE tenants
SET calendario_json = json_insert(calendario_json,
      '$.eventos[#]', json('{"fecha":"2026-09-14","titulo":"Cambio de actividades (14 al 18 de septiembre)","tipo":"efemeride","icon":"fa-shuffle"}'),
      '$.eventos[#]', json('{"fecha":"2026-09-21","titulo":"Inicio de clases 3° Trimestre","tipo":"pie","icon":"fa-school"}'),
      '$.eventos[#]', json('{"fecha":"2026-12-18","titulo":"Término de clases 3° Trimestre (semana recuperada)","tipo":"pie","icon":"fa-flag-checkered"}'))
WHERE slug = 'lcm-pulebu' AND json_valid(calendario_json)
  AND json_type(calendario_json, '$.eventos') = 'array'
  AND instr(calendario_json, 'Inicio de clases 3° Trimestre') = 0;
