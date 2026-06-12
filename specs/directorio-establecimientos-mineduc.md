# Spec: Directorio ministerial de establecimientos con buscador

- **Estado:** Implementada (2026-06-13)
- **Fecha:** 2026-06-13
- **Autor:** Carlos + Claude

## Que se quiere y por que
Al crear o editar un colegio en admin.html hay que escribir a mano el nombre, RBD,
comuna y region — con riesgo de errores en datos oficiales. Se quiere un buscador
que autocomplete esos datos desde el directorio OFICIAL del MINEDUC, manteniendo
la posibilidad de editar lo autocompletado.

Fuente: Directorio Oficial de Establecimientos 2025 (datosabiertos.mineduc.cl),
gratis y publico. 16.768 establecimientos con RBD + digito verificador, nombre,
region, comuna, dependencia, ruralidad, estado, matricula y convenio PIE.

## Criterios de aceptacion
- [ ] En admin.html, un buscador (por nombre o RBD) muestra coincidencias mientras se escribe.
- [ ] Elegir un resultado rellena: nombre oficial, RBD (con digito verificador), comuna y region; el slug y nombre corto se sugieren automaticamente. Todo queda editable.
- [ ] Los resultados muestran si el colegio tiene convenio PIE.
- [ ] La busqueda responde rapido (indice en D1) y requiere sesion admin.
- [ ] Existe un script reproducible para refrescar los datos cuando MINEDUC publique el directorio del proximo ano.

## Fuera de alcance
- Autocompletar datos de estudiantes o del registro de usuarios (eso usa los tenants ya creados).
- Actualizacion automatica periodica del directorio (refresh manual documentado).

## Ambiguedades (resueltas con Carlos, 2026-06-13)
- Alcance: TODOS los establecimientos en funcionamiento (~16 mil), con etiqueta PIE.
- Ubicaciones: admin.html (rellena el formulario completo) + ficha del estudiante
  (campo Establecimiento) + editor PACI (in-escuela) + modal "Agregar estudiante"
  (campo de colegio de procedencia). Widget reutilizable.
- El endpoint requiere sesion (cualquier rol), ya no solo admin, porque lo usan docentes.

## Plan tecnico (el COMO)
1. `scripts/build-establecimientos.js`: convierte el CSV oficial (separador ";", UTF-8 BOM)
   a `migrations/016_mineduc_establecimientos.sql` (CREATE TABLE + INSERTs por lotes).
   Columnas: rbd (PK), dgv, nombre, region, comuna, dependencia, rural, convenio_pie, matricula.
2. Aplicar migracion a D1 remota ANTES del deploy.
3. `functions/api/mineduc/establecimientos.js`: GET ?q= → LIKE sobre nombre y rbd,
   limite 10, solo admin/cuenta maestra.
4. admin.html: campo de busqueda sobre el grupo Identificacion con dropdown de
   resultados (debounce 300ms); al elegir, rellena el formulario.
5. Documentar el refresh anual en esta spec y en documentacion-tecnica.html.

## Resultado
Implementada el 2026-06-13. 12.038 establecimientos en funcionamiento cargados en D1
(6.412 con convenio PIE; mostrados con etiqueta PIE). Widget reutilizable en
`establecimientos-autocomplete.js`, integrado en: admin.html (rellena el formulario,
sugiere slug y nombre corto), ficha del estudiante (campo Establecimiento), editor
PACI (in-escuela) y modal "Agregar estudiante" (campo nuevo opcional).
Refresh anual: descargar el Directorio-Oficial-EE del nuevo ano desde
datosabiertos.mineduc.cl, extraer el CSV (tar.exe de Windows lee el .rar),
correr `node scripts/build-establecimientos.js <csv>` y aplicar la migracion 016
regenerada a D1 remota.
