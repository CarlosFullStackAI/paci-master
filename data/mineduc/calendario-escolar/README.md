# Calendarios escolares oficiales MINEDUC

Estructura: `{ano}/{region}.pdf` o `{ano}/nacional.pdf` segun corresponda.

## Calendarios actuales

- `2026/biobio.pdf` — REX-2159 Calendario Escolar Regional 2026, Biobio (vigente para Pulebu)

## Como agregar un nuevo ano

1. Crear carpeta `{ano}/` (ej. `2027/`).
2. Descargar el calendario oficial:
   - Nacional: `https://www.mineduc.cl` (busqueda "calendario escolar {ano}")
   - Regional: sitio de la SEREMI correspondiente (ej. SEREMI Biobio publica REX especifica)
3. Nombrar el archivo como `{region}.pdf` en kebab-case lowercase.

## Feriados irrenunciables

Estan definidos en la Ley 19.973 y modificaciones posteriores. Son:

- 1 de enero (Ano Nuevo)
- Viernes Santo y Sabado Santo
- 1 de mayo (Dia del Trabajador)
- 18 y 19 de septiembre (Fiestas Patrias)
- 25 de diciembre (Navidad)
- Dia de las elecciones presidenciales / parlamentarias / plebiscito (cuando corresponda)

Los calendarios escolares regionales los respetan obligatoriamente.

## Fase 2 — Integracion en la app

Hoy el calendario trimestral 2026 esta hardcoded en `app.html:5753`. Para multi-ano y multi-region, refactorizar para que la app lea fechas desde `config.json` del tenant o desde estos PDFs (parseados a JSON).
