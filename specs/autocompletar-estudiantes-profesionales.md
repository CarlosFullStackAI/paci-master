# Spec: Autocompletar estudiantes y profesionales en los editores

- **Estado:** Implementada (2026-07-10)
- **Fecha:** 2026-07-10
- **Autor:** Carlos + Claude

## Que se quiere y por que
Al crear un documento (PACI, PAI o documento generico), el educador hoy debe escribir
a mano los datos del estudiante y de los profesionales responsables, aunque ya esten
guardados en la plataforma. Se quiere poder AUTOCOMPLETAR ambos:
1. **Estudiante**: elegirlo de la base del colegio y que se rellenen sus datos de
   identificacion. Escribir a mano sigue siendo posible (ambas vias disponibles).
2. **Profesionales**: los nombres del equipo (docentes, especialistas PIE) salen de
   una lista propia de CADA colegio, editable por el admin — hoy estan escritos a
   fuego en el codigo de app.html (solo sirven para Pulebu, rompe multi-tenant).

## Criterios de aceptacion
- [ ] En app.html (PACI) y pai.html (PAI) hay un boton "Seleccionar estudiante" que
      abre el MISMO buscador que ya existe en docs.html (busqueda por nombre/RUT/
      diagnostico/curso, filtro por curso, lista agrupada).
- [ ] Al elegir un estudiante se rellenan SOLO los campos de identificacion en un
      documento nuevo (PACI: nombre, colegio, fecha nac + edad, diagnostico, niveles,
      habilidades; PAI: nombre, RUT, fecha nac, curso, diagnostico). No se abren ni
      mezclan documentos anteriores del estudiante.
- [ ] Escribir los datos a mano sigue funcionando igual que hoy en todos los editores.
- [ ] docs.html usa el componente compartido (sin duplicar codigo) y conserva su
      comportamiento actual, incluida la deteccion de diagnostico para FUR.
- [ ] La lista de profesionales por cargo vive en la BD (tabla tenants), es editable
      por el admin en admin.html, y cada colegio ve SOLO sus profesionales.
- [ ] app.html usa esa lista en "Equipo de Aula" (reemplaza la hardcodeada, que queda
      solo como fallback de red para lcm-pulebu, igual que el calendario escolar).
- [ ] pai.html ofrece los mismos nombres por cargo en "Equipo PIE" y "Equipo de Aula",
      manteniendo la opcion de escribir un nombre a mano ("Otro").
- [ ] Los profesionales actuales de Pulebu quedan cargados en la BD (seed) para que
      nada se pierda al cambiar la fuente.

## Fuera de alcance
- No se toca como se GUARDAN los documentos ni su formato JSON.
- No se agrega campo RUT al editor PACI.
- No se cambia el flujo de llegar por URL (?loadStudent= / ?student= / ?doc=).
- No se crea CRUD de profesionales como entidad propia (solo lista cargo->nombres
  dentro del tenant, como el calendario).
- No incluye la opcion de tamano de letra (feature aparte).

## Ambiguedades
(Resueltas con Carlos el 2026-07-10 via AskUserQuestion:)
- Forma de elegir estudiante: picker con buscador reutilizado de docs.html (no dropdown).
- Al elegir estudiante: solo rellena identificacion, no abre documentos previos.
- Editores: los tres (app.html, pai.html, docs.html).
- Fuente de profesionales: BD por colegio editable en admin (patron calendario_json).
- Alcance profesionales: PACI + PAI.

## Plan tecnico (el COMO)
1. **Migracion 016**: `ALTER TABLE tenants ADD COLUMN staff_json TEXT` (JSON
   `{ "Cargo": ["Nombre 1", "Nombre 2"], ... }`). Seed con los profesionales
   hardcodeados actuales para lcm-pulebu.
2. **Backend**: exponer `staff` en `/api/tenant-config` (igual que calendario) y
   aceptar `staff_json` en el update de `functions/api/admin/tenants`.
3. **admin.html**: seccion "Profesionales del colegio" (filas cargo + nombres,
   agregar/quitar), guarda en staff_json.
4. **estudiante-picker.js** (nuevo): extraer el picker de docs.html a un componente
   compartido autocontenido; expone `window.abrirSelectorEstudiante({ onSelect })`.
5. **app.html**: boton "Seleccionar estudiante" en la seccion 1 (rellena via
   setVal/setSelect existentes) + renderEquipoForm lee cargos/nombres desde
   TENANT_CONFIG con la lista actual como fallback.
6. **pai.html**: mismo boton (rellena su mapeo propio) + dropdowns de nombres por
   cargo en Equipo PIE y Equipo de Aula con opcion "Otro (escribir)".
7. **docs.html**: refactor para usar estudiante-picker.js, borrando el picker inline
   (conservando aplicarPrefillEstudiante y logica FUR como onSelect).
8. **Verificacion**: node --check del JS nuevo (via copia .mjs), migracion en D1
   remota (con confirmacion), prueba manual de los 3 editores + admin.
9. **Docs**: actualizar documentacion-tecnica.html (historial + badge).

## Resultado
- 2026-07-10: implementada segun el plan tecnico, sin desvios de alcance. Migracion 017
  aplicada en D1 remota (semilla lcm-pulebu: 18 cargos / 34 nombres). Desvio menor:
  en app.html el fallback hardcodeado se restringio a lcm-pulebu (u otro colegio SOLO
  si la config no cargo por red) — se detecto un segundo tenant en produccion que
  habria heredado los nombres de Pulebu. En pai.html las sugerencias usan datalist
  (elegir de la lista O escribir a mano en el mismo campo), que cumple el criterio
  "opcion Otro" sin duplicar UI. Commit: ver historial de documentacion-tecnica.html.
