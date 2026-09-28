# Spec: Rellenar los formatos oficiales MINEDUC (piloto: Anamnesis)

- **Estado:** Aprobada (implementacion pendiente)
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

## Plan tecnico (el COMO — se completa despues de aprobar el QUE)
Borrador:
1. Guardar el oficial .docx en `data/mineduc/formatos/` y armar un "mapa" (que dato va en que celda).
2. Rellenar en el navegador con `fflate` (ya instalado, gratis): abrir el .docx, escribir en
   `word/document.xml` las celdas del mapa y marcar casillas, volver a comprimir y descargar.
3. Boton "Descargar formato oficial" en `docs.html` para los documentos que tengan mapa.
4. PDF segun lo que se decida arriba.
5. Probar con 2 estudiantes, actualizar `documentacion-tecnica.html`.

## Resultado
<Al implementar: fecha, commit, y cualquier desvio respecto a la spec.>
