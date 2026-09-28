# Spec: Rellenar los formatos oficiales MINEDUC (piloto: Anamnesis)

- **Estado:** Implementada (piloto Anamnesis) — falta prueba con estudiantes reales
- **Fecha:** 2026-09-27
- **Autor:** Carlos + Claude

## Que se quiere y por que
Hoy los documentos PIE del dashboard (Anamnesis, FUDEI, informes...) se dibujan de nuevo como pagina
web y lo que se descarga es esa copia, que NO es identica al formato oficial (a la Anamnesis le faltan
secciones, la tabla familiar y las casillas de marcar). Carlos quiere que la app tome el **archivo
oficial del Ministerio** (el mismo que se descarga en linea) y lo **rellene** con los datos del
estudiante, sin cambiar su diseno. Asi el documento que se entrega al colegio es el oficial.

Piloto: **Anamnesis**. Si funciona, se repite con FUDEI, FUR, Informe psicopedagogico, Informe a la
familia y Poder simple.

## Criterios de aceptacion
- [ ] En el documento Anamnesis del dashboard aparece el boton **"Descargar formato oficial"**.
- [ ] El archivo descargado es el Word oficial del Ministerio (mismo diseno, tablas, textos y orden),
      con los datos puestos en sus celdas: identificacion, informantes, entrevistadores, motivo,
      tabla de convivientes, antecedentes, etc.
- [ ] Las casillas del oficial (tipo de parto, hitos, etc.) quedan marcadas segun los datos, no
      reemplazadas por texto libre.
- [ ] Lo que no tenga dato queda en blanco para completar a mano (sin "—" ni "undefined").
- [ ] Se entrega tambien en PDF (ver ambiguedad sobre como).
- [ ] Probado con 2 estudiantes reales: el Word abre sin errores en Microsoft Word y se ve igual al
      oficial vacio salvo por los datos.
- [ ] Todo gratis: sin librerias nuevas de pago ni servicios externos.

## Fuera de alcance
- Los demas documentos (FUDEI, FUR, informes, poder): van despues del piloto, uno por sesion.
- PAI y PACI (tienen su propio editor y formato del colegio).
- Cambiar como se guardan los datos en la base de datos, salvo lo minimo para los campos nuevos de la
  Anamnesis oficial.

## Decisiones (resueltas con Carlos, 2026-09-27)
- **Fuente oficial:** especial.mineduc.cl. La Anamnesis vigente es `ANAMNESIS_2010.doc` (identica a
  `data/mineduc/formatos/formato-anamnesis-2010.doc`, verificado por hash). Los FUR son uno por
  diagnostico (Ingreso y Reevaluacion, .doc 2012-2016). FUDEI NO es descargable (solo plataforma
  fudei.mineduc.cl desde 2021) -> fuera de alcance.
- **Conversion unica con Word** (instalado en el PC de Carlos): el .doc oficial se abre en Word y se
  guarda (1) como .docx y (2) como PDF vacio, sin editar nada. Ambos quedan en `data/mineduc/formatos/`.
- **Word relleno:** en el navegador con `fflate` (ya instalado) se escriben los datos en las celdas
  del .docx oficial y se marcan casillas.
- **PDF relleno ("otra solucion"):** se escriben los datos ENCIMA del PDF oficial vacio con `pdf-lib`
  (MIT, open source, gratis, corre en el navegador). PDF identico al oficial, sin Browser Rendering.
  **Aprobado por Carlos.** Regla: **NUNCA achicar la letra.** Si un texto no cabe en su casilla, la
  casilla muestra lo que cabe + "(continúa en anexo)" y el resto va en una hoja anexa al final del
  PDF, con el mismo tamano de letra y el titulo de la seccion.
- **Campos nuevos:** SI se agregan al formulario de Anamnesis todos los datos que pide el oficial
  (informantes, entrevistadores con fechas, motivo, tabla de convivientes, casillas).
- **IA:** SI propone casillas y filas de la tabla familiar (ademas de los parrafos), marcadas como
  sugerencia; la educadora revisa antes de descargar.

## Ambiguedades
Ninguna pendiente. Spec aprobada el 2026-09-27; la implementacion parte en una sesion nueva.
Los FUR oficiales descargados de muestra (D. Intelectual NEEP y FIL NEET) quedaron en
`data/mineduc/formatos/fur/` para la etapa siguiente.

## Decisiones adicionales (2026-09-27, sesion de implementacion)
- **Sí/No:** la opcion elegida lleva una **X en negrita** junto a la palabra; la otra queda igual.
- **Casillas □ (fuente Symbol F07F):** se reemplaza el glifo por una casilla marcada.
- **Formulario = igual al oficial:** mismas secciones, preguntas y orden. Los campos viejos que el
  oficial no pide (dinamica familiar, medicacion, etc.) desaparecen; eso se escribe en las
  "Observaciones" de cada seccion. No hay Anamnesis guardadas en D1 (verificado), no hay migracion.

## Hallazgos del oficial
- `.docx` convertido con `Wordconv.exe` (conversor silencioso de Office; la automatizacion COM de
  Word se trababa al guardar). 15 tablas, 133 filas, 89 casillas `w:sym` Symbol F07F, 90 pares
  Sí/No en celdas, sin campos de formulario. Encabezado "Ley 20.201 – Decreto 170/2009" y pie de
  confidencialidad se conservan tal cual.
- PDF: el **PDF oficial publicado por MINEDUC** (`ANAMNESIS_2010.pdf`, A4, 6 paginas) en vez de
  exportarlo desde Word. Guardado como `data/mineduc/formatos/formato-anamnesis-2010.pdf`.

## Plan tecnico (el COMO)
Etapa A — Word (esta sesion):
1. `docs-registry.js`: reescribir el schema de `anamnesis` calcado del oficial, con tipos nuevos
   `sino` (Sí/No), `opciones` (grupo de casillas) y `tabla` (filas fijas: 4 informantes,
   4 entrevistadores, 8 convivientes).
2. `docs.html`: renderizar y guardar esos tres tipos (el valor vacio = en blanco).
3. `formatos-oficiales/anamnesis-map.js`: mapa campo -> ubicacion en el .docx
   (tabla, fila, celda / indice de casilla).
4. `formatos-oficiales/rellenar-docx.js`: abre el .docx con `fflate` (copia del build UMD en
   `vendor/fflate.js`, servido desde el propio sitio, sin tocar la CSP), escribe textos, marca
   casillas y Sí/No, vuelve a comprimir y descarga.
5. Boton "Descargar formato oficial (Word)" en `docs.html`.
6. `functions/api/ai/fill-document.js`: que la IA tambien proponga Sí/No, casillas y filas, como
   sugerencia revisable.
Etapa B — PDF (sesion siguiente):
7. `scripts/build-anamnesis-pdf-map.js`: saca con pdfjs la posicion de cada etiqueta del PDF
   oficial y arma las coordenadas.
8. `pdf-lib` desde cdnjs (ya permitido por la CSP) escribe encima del PDF oficial; anexo si no cabe.
Cierre: probar con 2 estudiantes (Word abre sin errores, PDF revisado en imagen), actualizar
`documentacion-tecnica.html`.

## Resultado
Implementado 2026-09-27/28 (Etapa A y B en la misma sesion, por decision de Carlos).
- Desvios: (1) el PDF base es el publicado por MINEDUC, no uno exportado por Word (misma
  diagramacion, verificado). (2) La conversion .doc -> .docx se hizo con `Wordconv.exe`: la
  automatizacion COM de Word se trababa al guardar un .doc. (3) Las coordenadas del PDF se
  obtienen con una "sonda" (marcas aplastadas al 1% en una copia del .docx, exportada con Word);
  Sí/No y casillas se toman del PDF oficial y los limites de celda de sus bordes dibujados.
- Limitacion conocida (Word): en celdas Sí/No muy angostas la X baja a una segunda linea (la
  celda mide menos que "No X"); se lee bien y no se cambio el diseno del oficial.
- Pendiente: probar con 2 estudiantes reales en produccion (no habia Anamnesis guardadas).
- Si MINEDUC cambia el formato: reemplazar el .docx/.pdf, ajustar los `docx.at` del schema y
  regenerar el mapa (`node scripts/build-anamnesis-pdf-map.mjs sonda|mapa`).
