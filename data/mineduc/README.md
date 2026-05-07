# /data/mineduc — Data generica MINEDUC

Esta carpeta contiene datos curriculares y normativos chilenos que aplican a CUALQUIER establecimiento educacional. No depende del colegio especifico.

## Contenido

### `oas/` — Objetivos de Aprendizaje

- `lenguaje_raw.txt`, `matematica_raw.txt` — OAs de 1° a 6° basico (texto extraido de bases curriculares)
- `lenguaje_7_8_raw.txt`, `matematica_7_8_raw.txt` — OAs de 7° y 8° basico
- `nt_lenguaje_raw.txt`, `nt_matematica_raw.txt` — OAs de NT1/NT2 (parvularia)
- `oas-reales.js` — JS compilado por `scripts/build-oas.js`. Es el output usado como referencia (NO se importa directamente en la app — los OAs estan inline en `app.html`).
- `OAS-COMPLETOS-MINEDUC.md` — documentacion humana

### `bases-curriculares/` — PDFs oficiales

Bases Curriculares MINEDUC en PDF, descargados desde `curriculumnacional.cl`. Source de verdad para los OAs.

### `normativa/` — Decretos y Leyes

- `Decretos/` — Decretos relevantes (83/2015, 170/2009, 67/2018, etc.)
- `Leyes/` — Leyes (20422 Discapacidad, 20845 Inclusion, 20609 Antidiscriminacion, etc.)
- `Normativa internacional/` — Convenciones (Jomtien, Dakar)
- `otros normativos/` — Oficios, ordinarios, orientaciones

### `calendario-escolar/`

Calendarios escolares oficiales MINEDUC por ano y region. Estructura: `{ano}/{region}.pdf`.

Para agregar el calendario de un nuevo ano:
1. Crear carpeta `{ano}/`
2. Descargar PDFs desde `mineduc.cl` o el sitio de la SEREMI regional
3. Nombrar como `{region}.pdf` (ej. `biobio.pdf`, `metropolitana.pdf`)
4. Considerar feriados irrenunciables (publicados en el Diario Oficial)

### `formato-paci.docx`

Formato oficial del documento PACI segun Decreto 83/2015. Referencia para validar la estructura del PDF generado por la app.

### `asignaturas.docx`

Lista de asignaturas y su organizacion segun bases curriculares MINEDUC.
