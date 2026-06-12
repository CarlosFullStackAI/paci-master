// Convierte el Directorio Oficial de Establecimientos del MINEDUC (CSV de
// datosabiertos.mineduc.cl, separador ";", UTF-8 con BOM) en la migracion
// migrations/016_mineduc_establecimientos.sql para D1.
//
// Uso:  node scripts/build-establecimientos.js <ruta-al-csv>
// Refresh anual: descargar el nuevo Directorio-Oficial-EE-<ano>.rar, extraer el
// CSV, correr este script y aplicar la migracion regenerada a D1 remota.
//
// Solo establecimientos ESTADO_ESTAB=1 (funcionando).

const fs = require('fs');
const path = require('path');

const REGIONES = {
  1: 'Tarapacá', 2: 'Antofagasta', 3: 'Atacama', 4: 'Coquimbo', 5: 'Valparaíso',
  6: "O'Higgins", 7: 'Maule', 8: 'Biobío', 9: 'La Araucanía', 10: 'Los Lagos',
  11: 'Aysén', 12: 'Magallanes', 13: 'Metropolitana', 14: 'Los Ríos',
  15: 'Arica y Parinacota', 16: 'Ñuble'
};

const DEPENDENCIAS = {
  1: 'Municipal', 2: 'Particular Subvencionado', 3: 'Particular Pagado',
  4: 'Administración Delegada', 5: 'Servicio Local de Educación'
};

const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error('Uso: node scripts/build-establecimientos.js <ruta-al-csv-del-directorio>');
  process.exit(1);
}

// Title Case simple para nombres en MAYUSCULAS del directorio
const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'a', 'en', 'al']);
function titleCase(s) {
  return String(s).toLowerCase().split(/\s+/).map((w, i) => {
    if (i > 0 && MINUSCULAS.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ').trim();
}

function sqlStr(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
const lines = raw.split(/\r?\n/).filter(Boolean);
const headers = lines[0].split(';');
const col = (name) => headers.indexOf(name);

const iRBD = col('RBD'), iDGV = col('DGV_RBD'), iNOM = col('NOM_RBD');
const iREG = col('COD_REG_RBD'), iCOM = col('NOM_COM_RBD');
const iDEPE = col('COD_DEPE2'), iRURAL = col('RURAL_RBD');
const iPIE = col('CONVENIO_PIE'), iMAT = col('MAT_TOTAL'), iESTADO = col('ESTADO_ESTAB');

if ([iRBD, iDGV, iNOM, iREG, iCOM, iDEPE, iRURAL, iPIE, iMAT, iESTADO].includes(-1)) {
  console.error('El CSV no tiene las columnas esperadas. Headers: ' + headers.join(', '));
  process.exit(1);
}

const rows = [];
for (let n = 1; n < lines.length; n++) {
  const c = lines[n].split(';');
  if (c.length < headers.length - 5) continue;
  if (String(c[iESTADO]).trim() !== '1') continue; // solo funcionando
  const rbd = parseInt(c[iRBD], 10);
  const nombre = titleCase(c[iNOM]);
  if (!rbd || !nombre) continue;
  rows.push({
    rbd,
    dgv: String(c[iDGV] || '').trim(),
    nombre,
    region: REGIONES[parseInt(c[iREG], 10)] || '',
    comuna: titleCase(c[iCOM] || ''),
    dependencia: DEPENDENCIAS[parseInt(c[iDEPE], 10)] || '',
    rural: String(c[iRURAL]).trim() === '1' ? 1 : 0,
    pie: String(c[iPIE]).trim() === '1' ? 1 : 0,
    matricula: parseInt(c[iMAT], 10) || 0
  });
}

let sql = `-- Directorio oficial de establecimientos MINEDUC (datosabiertos.mineduc.cl).
-- GENERADO por scripts/build-establecimientos.js — NO editar a mano.
-- Solo establecimientos en funcionamiento. Fuente 2025: ${path.basename(csvPath)}
DROP TABLE IF EXISTS mineduc_establecimientos;
CREATE TABLE mineduc_establecimientos (
  rbd INTEGER PRIMARY KEY,
  dgv TEXT,
  nombre TEXT NOT NULL,
  region TEXT,
  comuna TEXT,
  dependencia TEXT,
  rural INTEGER DEFAULT 0,
  convenio_pie INTEGER DEFAULT 0,
  matricula INTEGER DEFAULT 0
);
`;

const LOTE = 250;
for (let i = 0; i < rows.length; i += LOTE) {
  const vals = rows.slice(i, i + LOTE).map(r =>
    `(${r.rbd},${sqlStr(r.dgv)},${sqlStr(r.nombre)},${sqlStr(r.region)},${sqlStr(r.comuna)},${sqlStr(r.dependencia)},${r.rural},${r.pie},${r.matricula})`
  ).join(',\n');
  sql += `INSERT INTO mineduc_establecimientos (rbd,dgv,nombre,region,comuna,dependencia,rural,convenio_pie,matricula) VALUES\n${vals};\n`;
}

const outPath = path.join(__dirname, '..', 'migrations', '016_mineduc_establecimientos.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`OK: ${rows.length} establecimientos -> ${outPath} (${Math.round(sql.length / 1024)} KB)`);
console.log(`Con convenio PIE: ${rows.filter(r => r.pie).length}`);
