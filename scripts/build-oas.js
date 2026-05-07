const fs = require('fs');
const path = require('path');

// Paths relativos al directorio del script (scripts/build-oas.js)
// para que el script funcione desde cualquier cwd.
const OAS_DIR = path.resolve(__dirname, '..', 'data', 'mineduc', 'oas');

function removeAccents(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

function extractOAsFromRaw(text) {
  const oas = [];
  // Try both formats: "  N   Text" (1-6 basico) and "N.   Text" (7-8 basico)
  const hasDots = /\d\.\s{2,}[A-Z]/.test(text);
  const regex = hasDots
    ? /(\d{1,2})\.\s{2,}([A-ZÁÉÍÓÚÑÜ][^]*?)(?=\d{1,2}\.\s{2,}[A-ZÁÉÍÓÚÑÜ]|$)/g
    : /\s(\d{1,2})\s{2,}([A-ZÁÉÍÓÚÑÜ][^]*?)(?=\s\d{1,2}\s{2,}[A-ZÁÉÍÓÚÑÜ]|\n\n|$)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const num = parseInt(m[1]);
    let txt = m[2].trim().replace(/\s+/g, ' ');
    // Clean headers/page numbers
    txt = txt.replace(/\d{3}\s+Bases Curriculares.*?Básico\s*/g, '');
    txt = txt.replace(/Lenguaje y Comunicación\s+\d{3}\s*/g, '');
    txt = txt.replace(/Matemática\s+\d{3}\s*/g, '');
    txt = txt.replace(/Los estudiantes serán capaces de:.*$/i, '');
    txt = txt.replace(/Objetivos de Aprendizaje.*$/i, '');
    txt = txt.replace(/\d+[°º]\s*básico\s*$/i, '');
    // Clean bullets
    txt = txt.replace(/ú\s+/g, '; ');
    txt = txt.trim().replace(/\.$/, '').trim();
    txt = removeAccents(txt);
    if (txt.length > 15 && num <= 50) {
      oas.push({ id: `OA ${num}`, texto: `OA ${num}: ${txt}.` });
    }
  }
  return oas;
}

function splitByAxes(text, axesDef) {
  const found = [];
  for (const ax of axesDef) {
    const idx = text.search(ax.regex);
    if (idx > -1) found.push({ ...ax, pos: idx });
  }
  found.sort((a, b) => a.pos - b.pos);

  if (found.length === 0) {
    const oas = extractOAsFromRaw(text);
    return oas.length ? [{ id: 'all', nombre: 'Objetivos de Aprendizaje', oas }] : [];
  }

  const unidades = [];
  for (let i = 0; i < found.length; i++) {
    const start = found[i].pos;
    const end = i + 1 < found.length ? found[i + 1].pos : text.length;
    const oas = extractOAsFromRaw(text.substring(start, end));
    if (oas.length) unidades.push({ id: found[i].id, nombre: found[i].nombre, oas });
  }
  return unidades;
}

const LENGUAJE_AXES = [
  { regex: /Lectura\s{2,}\d/, id: 'lectura', nombre: 'Eje: Lectura' },
  { regex: /Escritura\s{2,}\d/, id: 'escritura', nombre: 'Eje: Escritura' },
  { regex: /Comunicación oral\s{2,}\d/i, id: 'com_oral', nombre: 'Eje: Comunicacion Oral' },
  { regex: /Investigación\s/i, id: 'inv', nombre: 'Eje: Investigacion' },
];

const MAT_AXES = [
  { regex: /N[uú]meros\s+y\s+Operaciones\s+\d/i, id: 'num', nombre: 'Eje: Numeros y Operaciones' },
  { regex: /Patrones\s+y\s+[áa]\s*lgebra\s+\d/i, id: 'pat', nombre: 'Eje: Patrones y Algebra' },
  { regex: /Geometr[ií]a\s+\d/i, id: 'geo', nombre: 'Eje: Geometria' },
  { regex: /Medici[oó]n\s+\d/i, id: 'med', nombre: 'Eje: Medicion' },
  { regex: /Datos\s+y\s+Probabilidades?\s+\d/i, id: 'dat', nombre: 'Eje: Datos y Probabilidades' },
];

// ============================================
// NT (Parvularia)
// ============================================
function parseNTDots(text) {
  const oas = [];
  const regex = /(\d{1,2})\.\s+([^]*?)(?=\d{1,2}\.\s+|Comunicación Integral|Interacción|$)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    let txt = m[2].trim().replace(/\s+/g, ' ').replace(/\.$/, '').trim();
    txt = removeAccents(txt);
    if (txt.length > 10) oas.push({ id: `OA ${m[1]}`, texto: `OA ${m[1]}: ${txt}.` });
  }
  return oas;
}

const ntLOAs = parseNTDots(fs.readFileSync(path.join(OAS_DIR, 'nt_lenguaje_raw.txt'), 'utf-8'));
const ntMOAs = parseNTDots(fs.readFileSync(path.join(OAS_DIR, 'nt_matematica_raw.txt'), 'utf-8'));
console.log('NT Lenguaje:', ntLOAs.length, '| NT Mat:', ntMOAs.length);

// ============================================
// 1° a 6° Basico
// ============================================
const rawLeng = fs.readFileSync(path.join(OAS_DIR, 'lenguaje_raw.txt'), 'utf-8');
const rawMat = fs.readFileSync(path.join(OAS_DIR, 'matematica_raw.txt'), 'utf-8');
const gradeNames = ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto'];
const gradeKeys = ['1b', '2b', '3b', '4b', '5b', '6b'];

function splitByGrades(raw, names) {
  const chunks = {};
  for (let i = 0; i < names.length; i++) {
    const pattern = names[i] + ' Básico';
    const alt = names[i] + ' básico';
    let start = raw.indexOf(pattern);
    if (start === -1) start = raw.indexOf(alt);
    if (start === -1) { console.log('WARNING: ' + names[i] + ' not found'); continue; }

    let end = raw.length;
    if (i + 1 < names.length) {
      const p2 = names[i+1] + ' Básico';
      const a2 = names[i+1] + ' básico';
      const e1 = raw.indexOf(p2, start + 10);
      const e2 = raw.indexOf(a2, start + 10);
      if (e1 > -1) end = e1;
      else if (e2 > -1) end = e2;
    }
    chunks[gradeKeys[i]] = raw.substring(start, end);
  }
  return chunks;
}

const lengChunks = splitByGrades(rawLeng, gradeNames);
const matChunks = splitByGrades(rawMat, gradeNames);

const lenguaje = {}, matematica = {};

for (const [key, chunk] of Object.entries(lengChunks)) {
  const unidades = splitByAxes(chunk, LENGUAJE_AXES);
  lenguaje[key] = { unidades };
  const total = unidades.reduce((s, u) => s + u.oas.length, 0);
  console.log(key, 'Leng:', total, 'OAs |', unidades.map(u => u.id + ':' + u.oas.length).join(', '));
}

for (const [key, chunk] of Object.entries(matChunks)) {
  // Mat 1-2 basico might not have named axes, just flat list
  let unidades = splitByAxes(chunk, MAT_AXES);
  if (unidades.length === 0) {
    const oas = extractOAsFromRaw(chunk);
    if (oas.length) unidades = [{ id: 'all', nombre: 'Matematica', oas }];
  }
  matematica[key] = { unidades };
  const total = unidades.reduce((s, u) => s + u.oas.length, 0);
  console.log(key, 'Mat:', total, 'OAs |', unidades.map(u => u.id + ':' + u.oas.length).join(', '));
}

// ============================================
// 7° y 8° Basico
// ============================================
const rawLeng78 = fs.readFileSync(path.join(OAS_DIR, 'lenguaje_7_8_raw.txt'), 'utf-8');
const rawMat78 = fs.readFileSync(path.join(OAS_DIR, 'matematica_7_8_raw.txt'), 'utf-8');

function splitAt78(raw) {
  // Find 2nd "Se espera" = start of 8° basico
  const first = raw.indexOf('Se espera');
  const second = first > -1 ? raw.indexOf('Se espera', first + 500) : -1;
  // Find 3rd = start of 1° medio (we don't want this)
  const third = second > -1 ? raw.indexOf('Se espera', second + 500) : -1;

  let split7_8 = second > -1 ? second - 200 : Math.floor(raw.length / 2);
  let end8 = third > -1 ? third - 200 : raw.length;

  return [raw.substring(0, split7_8), raw.substring(split7_8, end8)];
}

const [leng7raw, leng8raw] = splitAt78(rawLeng78);
const [mat7raw, mat8raw] = splitAt78(rawMat78);

lenguaje['7b'] = { unidades: splitByAxes(leng7raw, LENGUAJE_AXES) };
lenguaje['8b'] = { unidades: splitByAxes(leng8raw, LENGUAJE_AXES) };
matematica['7b'] = { unidades: splitByAxes(mat7raw, MAT_AXES) };
matematica['8b'] = { unidades: splitByAxes(mat8raw, MAT_AXES) };

for (const g of ['7b', '8b']) {
  const lt = lenguaje[g].unidades.reduce((s, u) => s + u.oas.length, 0);
  const mt = matematica[g].unidades.reduce((s, u) => s + u.oas.length, 0);
  console.log(g, 'Leng:', lt, '| Mat:', mt);
}

// ============================================
// BUILD OUTPUT
// ============================================
const output = {
  lenguaje: {
    nt1: { unidades: [{ id: 'lv', nombre: 'Nucleo: Lenguaje Verbal', oas: ntLOAs }] },
    nt2: { unidades: [{ id: 'lv', nombre: 'Nucleo: Lenguaje Verbal', oas: ntLOAs }] },
    ...lenguaje
  },
  matematica: {
    nt1: { unidades: [{ id: 'pm', nombre: 'Nucleo: Pensamiento Matematico', oas: ntMOAs }] },
    nt2: { unidades: [{ id: 'pm', nombre: 'Nucleo: Pensamiento Matematico', oas: ntMOAs }] },
    ...matematica
  }
};

let totalOAs = 0;
for (const [subj, levels] of Object.entries(output)) {
  for (const [level, data] of Object.entries(levels)) {
    totalOAs += data.unidades.reduce((s, u) => s + u.oas.length, 0);
  }
}
console.log('\n=== TOTAL: ' + totalOAs + ' OAs ===');

const js = '// OAs Reales - Bases Curriculares Mineduc Chile\n' +
  '// Lenguaje y Comunicacion + Matematica: NT1 a 8 Basico\n' +
  '// Generado desde PDFs oficiales el ' + new Date().toISOString().split('T')[0] + '\n' +
  'const OAS_REALES = ' + JSON.stringify(output, null, 2) + ';\n';
fs.writeFileSync(path.join(OAS_DIR, 'oas-reales.js'), js);
console.log('oas-reales.js: ' + (js.length / 1024).toFixed(1) + ' KB');
