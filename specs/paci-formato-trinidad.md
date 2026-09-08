# Spec: Rediseño del documento PACI al formato de la profesora Trinidad Aguilera

- **Estado:** Aprobada (decisiones resueltas con Carlos el 07/09/2026)
- **Fecha:** 2026-09-07
- **Autor:** Carlos + Claude

## Que se quiere y por que
El documento PACI que imprime la app debe verse igual a los PACI reales que la
profesora Trinidad Aguilera entrega en la Escuela Luis Cruz Martínez (referencia:
`PACI_Johan_Saez_2026.pdf` y `PACI_Diego_Marin_Eade_2026.pdf`, período jun-sep 2026).
Así la educadora puede imprimir directo desde la app un documento indistinguible
del formato que el colegio ya usa y firma, sin rehacerlo en Word.

## Criterios de aceptacion
- [ ] Página horizontal (letter landscape) en todo el documento, margen 1cm, letra sans, tamaño ~9-10pt.
- [ ] Encabezado institucional repetido en TODAS las páginas: logo escuela + "Escuela Luis Cruz Martínez / PULEBU - CAÑETE" (desde tenant) a la izquierda, "Programa de Integración Escolar / PIE - <año>" + logo PIE a la derecha.
- [ ] Título centrado: "PLANIFICACIÓN DE ADECUACIÓN CURRICULAR INDIVIDUAL. (PACI)".
- [ ] Tablas con borde negro fino y celdas de encabezado celeste (#8faadc aprox.), texto azul oscuro en negrita.
- [ ] Secciones en este orden exacto:
  1. Identificación: Nombre y código del Establecimiento (+RBD) | N° Formulario FUR/FUI; Comuna | Región; Nombre del estudiante | Curso; F. Nacimiento | Edad; Diagnóstico | Duración ("DD/MM/AAAA al DD/MM/AAAA").
  2. PROFESIONALES RESPONSABLES | NOMBRES | FIRMAS.
  3. EVALUACIÓN Y CRITERIOS DE PROMOCIÓN (caja con viñetas, precargada).
  4. ORGANIZACIÓN DE APOYOS ESPECIALIZADOS (Especialista | Tipo de adecuación | Ubicación | Horas semanales | Horarios | Fecha inicio | Fecha término; precargada con Educador/a Diferencial, Psicólogo/a, Fonoaudiólogo/a).
  5. OBJETIVOS A TRABAJAR EN LA ASIGNATURA DE: X (OA con texto completo, por asignatura; en parvularia dice ÁMBITO/NÚCLEO).
  6. PLANIFICACIÓN DE OBJETIVOS: <ASIGNATURA> con columnas Objetivo/s ("Clase N · Semana DD al DD de <mes> · OA x y OA y") | Actividades, estrategias (DUA) y recursos | Indicadores de Evaluación (Conceptual/Procedimental/Actitudinal en un bloque) | Niveles de Logro: L | ML | PL **vacías** (se marcan a mano).
  7. METAS DE LOGRO Y EVALUACIÓN (Asignatura | Meta de logro al <fecha fin> | Instrumento y evidencia | Criterio de logro).
  8. FECHA REVISIÓN | AJUSTES REALIZADOS | RESPONSABLE (filas repetibles).
  9. OBSERVACIONES GENERALES (texto libre).
- [ ] Secciones nuevas precargadas con textos por defecto del formato Trinidad, todas editables.
- [ ] Gantt de temporalización, caja legal y consolidado de materiales ya no van en el cuerpo: solo aparecen si se activa el checkbox "Incluir anexos" (apagado por defecto), al final bajo "ANEXOS".
- [ ] Logos de escuela y PIE se cargan solos desde `data/tenants/<slug>/logos/` y quedan guardados con el documento.
- [ ] Documentos PACI ya guardados abren sin errores: campos nuevos aparecen con sus defaults.
- [ ] Descarga PDF con nombre `PACI_<Nombre>_<año>.pdf`; el PDF y `window.print()` respetan el formato.

## Fuera de alcance
- PAI, informes y demás documentos de docs-registry.js no cambian.
- El flujo de firmas digitales (window.firmasPACI) no cambia.
- No se agrega persistencia de checkboxes L/ML/PL (se imprimen vacíos a propósito).
- No se replica la división en "períodos" de Trinidad (la app sigue agrupando por asignatura/módulo).

## Ambiguedades
(Resueltas con Carlos 07/09/2026: reemplazo total del formato; L/ML/PL vacías;
textos por defecto precargados; secciones viejas como anexo opcional.)

## Plan tecnico (el COMO)
1. `functions/api/tenant-config.js`: incluir `rbd` y `comuna` en la respuesta (ya vienen de tenant-helper).
2. `functions/api/ai/generate-classes.js`: campo `oa` por clase (qué OA trabaja), normalizado; opcional para docs viejos.
3. `app.html` formulario: N° FUR/FUI, editor de organización de apoyos, criterios de promoción precargados, `criterio` en metas, filas de fecha revisión, observaciones generales, checkbox anexos. Todo entra a `recolectarDatosPACI()` y se restaura al cargar.
4. `app.html` documento + `paci.css`: reescritura de `#documento` y `renderModulos()` al formato Trinidad (helpers estilo `pai.html`), encabezado repetido vía `<thead>`, `@page letter landscape`, fuente sans, logos automáticos del tenant persistidos en el documento, filename con año.
5. `documentacion-tecnica.html`: entrada en el historial.

## Resultado
- Implementada el 2026-09-08 (commit pendiente de confirmación de Carlos).
- Verificación: PDF de prueba con datos de Johan generado vía Chrome headless
  (print-to-pdf) comparado página a página contra el PDF real de Trinidad:
  landscape, encabezado repetido, orden de secciones, tablas celestes,
  L/ML/PL vacías y anexos on/off — OK. ESLint (security:sast) limpio.
- Desvíos/pendientes:
  - El export Word (.docx) mantiene el formato anterior (solo PDF/print cambiaron).
  - PENDIENTE producción: poblar `tenants.rbd` ('5151-9') y `tenants.comuna`
    ('Cañete') en D1 remoto (el seed de la migración 011 los dejó '').
  - El campo `oa` por clase solo existe en clases generadas desde ahora; las
    antiguas muestran "Clase N · Semana ..." sin código de OA (editable a mano).
