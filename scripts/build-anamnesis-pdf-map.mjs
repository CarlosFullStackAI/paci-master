// Arma el mapa de coordenadas para escribir la Anamnesis sobre el PDF OFICIAL de MINEDUC.
//
// Idea: el PDF oficial y el que exporta Word desde el .docx oficial tienen la misma
// diagramacion (verificado: diferencias < 0,5 pt). Entonces:
//   1) `sonda`: copia el .docx oficial y pone marcas diminutas (letra de 1 pt, no mueven
//      nada) justo donde el rellenador de Word escribiria cada dato.
//   2) Se exporta esa copia a PDF con Microsoft Word (paso manual, ver abajo).
//   3) `mapa`: lee con pdfjs donde quedo cada marca en el PDF y la posicion de las 89
//      casillas del PDF oficial, y escribe formatos-oficiales/anamnesis-pdf-map.js.
//
// Uso (Windows, con Word instalado):
//   node scripts/build-anamnesis-pdf-map.mjs sonda <salida.docx>
//   (exportar <salida.docx> a PDF con Word: Archivo > Guardar como > PDF, o COM ExportAsFixedFormat)
//   node scripts/build-anamnesis-pdf-map.mjs mapa <sonda.pdf>
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fflate = require(path.join(REPO, 'node_modules/fflate'));
const { indexarCeldas, interno } = require(path.join(REPO, 'formatos-oficiales/rellenar-docx.js'));
const DOCX = path.join(REPO, 'data/mineduc/formatos/formato-anamnesis-2010.docx');
const PDF = path.join(REPO, 'data/mineduc/formatos/formato-anamnesis-2010.pdf');
const SALIDA = path.join(REPO, 'formatos-oficiales/anamnesis-pdf-map.js');
const MARGEN_CELDA = 5.4; // margen interno por defecto de las celdas de Word (0,19 cm)

function cargarSchema() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(REPO, 'docs-registry.js'), 'utf8'), ctx);
  return ctx.window.DOC_TYPES.anamnesis.schema;
}

// Lista de lugares a ubicar: textos (con su modo), marcas X (Sí/No, sexo) y casillas.
function objetivos(schema) {
  const out = [];
  schema.sections.forEach((sec) => sec.fields.forEach((f) => {
    const d = f.docx;
    if (!d) return;
    if (f.type === 'sino') {
      out.push({ clave: f.id + ':Sí', tipo: 'marca', celda: d.si.join('.') });
      out.push({ clave: f.id + ':No', tipo: 'marca', celda: d.no.join('.') });
    } else if (d.marks) {
      Object.entries(d.marks).forEach(([o, at]) => out.push({ clave: f.id + ':' + o, tipo: 'marca', celda: at.join('.') }));
    } else if (f.type === 'opciones') {
      f.options.forEach((o, i) => out.push({ clave: f.id + ':' + o, tipo: 'casilla', celda: d.at.join('.'), indice: d.first + i }));
    } else if (f.type === 'tabla') {
      d.cells.forEach((fila, r) => f.columns.forEach((c, ci) =>
        out.push({ clave: f.id + '.' + r + '.' + c.key, tipo: 'texto', celda: fila[ci].join('.'), modo: d.modes[ci] })));
    } else {
      [d.at].concat(d.also || []).forEach((at, i) =>
        out.push({ clave: f.id + (i ? '@' + i : ''), tipo: 'texto', celda: at.join('.'), modo: d.mode, n: d.n }));
    }
  }));
  return out;
}

// Las marcas conservan el tamano de letra (en Word una linea vacia toma su alto de la marca
// de parrafo; con un texto de 1 pt se achicaba y movia la pagina) pero van aplastadas al 1%
// de ancho, asi no empujan nada hacia el lado.
const aplastar = (rpr) => {
  const base = (rpr || '<w:rPr></w:rPr>').replace(/<w:w [^>]*\/>/g, '');
  return base.replace('</w:rPr>', '<w:w w:val="1"/></w:rPr>');
};
const achicar = (celda) => celda.replace(/<w:r>(<w:rPr>[\s\S]*?<\/w:rPr>)?(<w:t xml:space="preserve"> ?~\d+[se]?~ ?<\/w:t><\/w:r>)/g,
  (m0, rpr, resto) => '<w:r>' + aplastar(rpr) + resto);
const alFinal = (celda, marca) => {
  const i = celda.lastIndexOf('</w:p>');
  if (i < 0) return celda;
  const iniP = Math.max(celda.lastIndexOf('<w:p>', i), celda.lastIndexOf('<w:p ', i));
  const rpr = interno.rprBase(celda.slice(iniP, i + 6), false);
  return celda.slice(0, i) + '<w:r>' + aplastar(rpr) + '<w:t xml:space="preserve">' + marca + '</w:t></w:r>' + celda.slice(i);
};

function sonda(destino) {
  const schema = cargarSchema();
  const zip = fflate.unzipSync(fs.readFileSync(DOCX));
  let xml = fflate.strFromU8(zip['word/document.xml']);
  const celdas = indexarCeldas(xml);
  const objs = objetivos(schema);
  const porCelda = {};
  objs.forEach((o, k) => {
    if (o.tipo === 'casilla') return;
    const fns = porCelda[o.celda] = porCelda[o.celda] || [];
    // Las marcas X (Sí/No, F/M) no llevan sonda: se toman de las palabras del PDF oficial.
    if (o.tipo === 'marca') return;
    const m = '~' + k + '~';
    const principal = o.modo === 'fill' ? (c) => interno.rellenarLinea(c, m, o.n) : (c) => interno.escribir(c, m, o.modo);
    fns.push({ orden: o.modo === 'fill' ? -o.n : 0, fn: principal });
    fns.push({ orden: 2, fn: (c) => alFinal(c, '~' + k + 'e~') });
  });
  Object.keys(porCelda).sort((a, b) => celdas[b][0] - celdas[a][0]).forEach((k) => {
    const [ini, fin] = celdas[k];
    let celda = xml.slice(ini, fin);
    porCelda[k].sort((a, b) => a.orden - b.orden).forEach((o) => { celda = o.fn(celda); });
    xml = xml.slice(0, ini) + achicar(celda) + xml.slice(fin);
  });
  zip['word/document.xml'] = fflate.strToU8(xml);
  fs.writeFileSync(destino, fflate.zipSync(zip, { level: 6 }));
  console.log('Sonda escrita:', destino, '| objetivos:', objs.length);
}

async function leerPdf(archivo) {
  const pdfjs = await import(pathToFileURL(path.join(REPO, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(archivo)), verbosity: 0 }).promise;
  const items = [];
  let tam = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    if (!tam) { const vp = page.getViewport({ scale: 1 }); tam = [vp.width, vp.height]; }
    (await page.getTextContent()).items.forEach((it) => items.push({ p, s: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.transform[3]) }));
  }
  return { paginas: doc.numPages, tam, items };
}

// Lineas de texto letra por letra (con x y ancho). Se ordenan los trozos, no las letras
// sueltas: los trozos aplastados de la sonda se solapan y el orden letra por letra los
// revolveria; a igual x manda el orden original del PDF.
function armarLineas(items) {
  const lineas = [];
  items.map((it, n) => ({ ...it, n })).sort((a, b) => a.p - b.p || b.y - a.y).forEach((it) => {
    let l = lineas[lineas.length - 1];
    if (!l || l.p !== it.p || Math.abs(l.y - it.y) >= 1) { l = { p: it.p, y: it.y, trozos: [] }; lineas.push(l); }
    l.trozos.push(it);
  });
  lineas.forEach((l) => {
    l.trozos.sort((a, b) => a.x - b.x || a.n - b.n);
    l.chars = [];
    l.trozos.forEach((it, t) => [...it.s].forEach((ch) => l.chars.push({ ch, t, p: it.p, y: l.y })));
    // Las letras de las marcas (~12~, ~12e~ y el espacio que las antecede) van aplastadas:
    // ancho cero. El ancho de cada trozo se reparte solo entre sus letras normales (pdfjs
    // junta a veces etiqueta y marca en un mismo trozo, p. ej. "Nombre: ~").
    const texto = l.chars.map((c) => c.ch).join('');
    const re = / ?~\d*e?~?|\d*e?~/g;
    let m;
    while ((m = re.exec(texto))) {
      if (!m[0].includes('~')) { re.lastIndex++; continue; }
      for (let i = m.index; i < m.index + m[0].length; i++) l.chars[i].marca = true;
    }
    l.trozos.forEach((it, t) => {
      const propias = l.chars.filter((c) => c.t === t);
      const normales = propias.filter((c) => !c.marca).length;
      let x = it.x;
      propias.forEach((c) => {
        c.x = x;
        c.w = c.marca ? 0 : (normales ? it.w / normales : 0);
        x += c.w;
      });
    });
  });
  return lineas;
}

// Bordes de las tablas del PDF oficial: Word los dibuja como rectangulos rellenos finos.
async function leerBordes(archivo) {
  const pdfjs = await import(pathToFileURL(path.join(REPO, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(archivo)), verbosity: 0 }).promise;
  const bordes = {};
  for (let p = 1; p <= doc.numPages; p++) {
    const ops = await (await doc.getPage(p)).getOperatorList();
    const h = [];
    const v = [];
    ops.fnArray.forEach((f, k) => {
      if (f !== pdfjs.OPS.constructPath) return;
      const [x1, y1, x2, y2] = Array.from(ops.argsArray[k][2]);
      if (y2 - y1 < 2 && x2 - x1 >= 2) h.push({ x1, x2, y: (y1 + y2) / 2 });
      else if (x2 - x1 < 2 && y2 - y1 >= 2) v.push({ y1, y2, x: (x1 + x2) / 2 });
    });
    bordes[p] = { h, v };
  }
  return bordes;
}

// Borde inferior y derecho de la celda que contiene el punto (x, y) de una linea de texto.
function limitesCelda(bordes, p, x, y) {
  const { h, v } = bordes[p];
  const abajo = h.filter((l) => l.y < y - 1 && l.x1 <= x + 1 && l.x2 >= x + 1).reduce((a, l) => (l.y > a ? l.y : a), -Infinity);
  const cruza = (l) => l.y1 <= y + 3 && l.y2 >= y + 3;
  const derecha = v.filter((l) => l.x > x + 1 && cruza(l)).reduce((a, l) => (l.x < a ? l.x : a), Infinity);
  const izquierda = v.filter((l) => l.x < x - 1 && cruza(l)).reduce((a, l) => (l.x > a ? l.x : a), -Infinity);
  return { abajo, derecha, izquierda };
}

async function mapa(pdfSonda) {
  const schema = cargarSchema();
  const objs = objetivos(schema);
  const xml = fflate.strFromU8(fflate.unzipSync(fs.readFileSync(DOCX))['word/document.xml']);
  const celdas = indexarCeldas(xml);
  const ancho = (k) => { const [a, b] = celdas[k]; const m = xml.slice(a, b).match(/<w:tcW w:w="(\d+)"/); return m ? +m[1] / 20 : 0; };

  // Marcas de la sonda: '~k~' (lugar del dato) y '~ke~' (fin de celda). Al ir aplastadas,
  // pdfjs las parte en varios trozos ("~", "54", "~"): se rearma cada linea letra por letra.
  const sondaPdf = await leerPdf(pdfSonda);
  const lineas = armarLineas(sondaPdf.items);
  // pdfjs rellena los huecos entre celdas con un "espacio" ancho: sirve de borde de celda.
  const esHueco = (c) => c.ch === ' ' && c.w > 8;
  const marcas = {};
  lineas.forEach(({ chars: l }) => {
    const texto = l.map((c) => c.ch).join('');
    const re = /~(\d+e?)~/g;
    let m;
    while ((m = re.exec(texto))) {
      const c = l[m.index];
      // x0: inicio de la linea dentro de la celda (primera letra de la etiqueta).
      let i = m.index - 1;
      let x0 = c.x;
      // finEtiqueta: donde termina la ultima letra antes de la marca (en parrafos
      // justificados la marca puede quedar lejos de la etiqueta).
      let finEtiqueta = null;
      for (let q = m.index - 1; q >= 0 && !esHueco(l[q]); q--) {
        if (l[q].ch !== ' ' && l[q].ch !== '~' && l[q].w >= 1) { finEtiqueta = l[q].x + l[q].w; break; }
      }
      while (i >= 0 && !esHueco(l[i]) && l[i].x + l[i].w >= x0 - 3) { if (l[i].ch !== ' ') x0 = l[i].x; else x0 = Math.min(x0, l[i].x); i--; }
      while (i + 1 < m.index && l[i + 1].ch === ' ' && l[i + 1].x <= x0) { i++; }
      // xSig: primera letra visible a la derecha (texto que sigue en la celda o la celda vecina).
      let j = m.index + m[0].length;
      let hueco = false;
      while (j < l.length && (l[j].ch === ' ' || l[j].ch === '~' || /\d/.test(l[j].ch) && l[j].w < 1)) { if (esHueco(l[j])) hueco = true; j++; }
      let jf = j;
      while (jf < l.length && l[jf].ch !== ' ') jf++;
      marcas[m[1]] = {
        p: c.p, x: +c.x.toFixed(1), y: +c.y.toFixed(1), x0: +x0.toFixed(1),
        xSig: j < l.length ? +l[j].x.toFixed(1) : null, sigEsOtraCelda: hueco || j >= l.length,
        xSigFin: jf > j ? +(l[jf - 1].x + l[jf - 1].w).toFixed(1) : null,
        finEtiqueta
      };
    }
  });

  // Marcas X: las palabras Sí/No/F/M de las celdas que solo contienen esa palabra, en orden
  // del .docx, emparejadas con las mismas palabras del PDF oficial (sin contar las que van
  // justo despues de una casilla, que son opciones de casillas).
  const oficialItems = (await leerPdf(PDF)).items;
  const bordes = await leerBordes(PDF);
  const lineasOficial = armarLineas(oficialItems);
  const PALABRA = /^(Sí|Si|SI|No|NO|F|M)$/;
  const textoCelda = (k) => { const [a, b] = celdas[k]; return (xml.slice(a, b).match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join('').trim(); };
  const celdasPalabra = Object.keys(celdas).sort((a, b) => celdas[a][0] - celdas[b][0]).filter((k) => PALABRA.test(textoCelda(k)));
  const palabrasPdf = oficialItems.filter((it, i) => PALABRA.test(it.s.trim()) && !(i > 0 && oficialItems[i - 1].s.includes('')) && !(i > 1 && oficialItems[i - 1].s.trim() === '' && oficialItems[i - 2].s.includes('')));
  if (celdasPalabra.length !== palabrasPdf.length) throw new Error('Palabras Sí/No: docx ' + celdasPalabra.length + ' vs PDF ' + palabrasPdf.length);
  const posPalabra = {};
  celdasPalabra.forEach((k, i) => {
    const w = palabrasPdf[i];
    if (w.s.trim().toLowerCase() !== textoCelda(k).toLowerCase()) throw new Error('Palabra distinta en ' + k + ': ' + w.s + ' vs ' + textoCelda(k));
    posPalabra[k] = { p: w.p, x: +(w.x + w.w + 2).toFixed(1), y: +w.y.toFixed(1) };
  });

  // Casillas: glifo U+F07F en el PDF oficial, en el mismo orden que <w:sym> en el .docx.
  const oficial = { tam: (await leerPdf(PDF)).tam, items: oficialItems };
  const cajas = oficial.items.filter((it) => it.s.includes(''));
  const symAntes = {};
  let acum = 0;
  Object.keys(celdas).sort((a, b) => celdas[a][0] - celdas[b][0]).forEach((k) => {
    symAntes[k] = acum;
    const [a, b] = celdas[k];
    acum += (xml.slice(a, b).match(/<w:sym /g) || []).length;
  });
  if (cajas.length !== acum) throw new Error('Casillas: PDF ' + cajas.length + ' vs docx ' + acum);

  const campos = {};
  const faltan = [];
  objs.forEach((o, k) => {
    if (o.tipo === 'casilla') {
      const c = cajas[symAntes[o.celda] + o.indice];
      campos[o.clave] = { p: c.p, x: +c.x.toFixed(1), y: +c.y.toFixed(1), w: +c.w.toFixed(1), h: +c.h.toFixed(1) };
      return;
    }
    if (o.tipo === 'marca') {
      if (!posPalabra[o.celda]) { faltan.push(o.clave + ' (celda sin Sí/No)'); return; }
      campos[o.clave] = posPalabra[o.celda];
      return;
    }
    const m = marcas[k];
    if (!m) { faltan.push(o.clave); return; }
    // Limites reales de la celda (bordes dibujados); si no hay borde, el ancho del .docx.
    const lim = limitesCelda(bordes, m.p, m.x, m.y);
    let r = Number.isFinite(lim.derecha) ? lim.derecha - 3 : m.x0 + ancho(o.celda) - 2 * MARGEN_CELDA;
    if (m.xSig != null && m.sigEsOtraCelda && !Number.isFinite(lim.derecha)) r = Math.min(r, m.xSig - 2 * MARGEN_CELDA);
    let x = m.x;
    if (o.modo === 'append' && m.finEtiqueta != null) x = m.finEtiqueta + 3;
    if (o.modo === 'prepend') {
      // El dato va antes de "años"/"meses" (alineados a la derecha): desde el borde
      // izquierdo de la celda hasta la palabra; si no hay lugar, despues de la palabra.
      // La palabra se busca en el PDF oficial (en la sonda se quitaron sus espacios).
      const lo = lineasOficial.find((q) => q.p === m.p && Math.abs(q.y - m.y) < 1);
      const izq = Number.isFinite(lim.izquierda) ? lim.izquierda : m.x - 3;
      const der = Number.isFinite(lim.derecha) ? lim.derecha : Infinity;
      const letras = lo ? lo.chars.filter((ch) => ch.x > izq && ch.x < der && ch.ch.trim() && ch.w > 0) : [];
      if (letras.length) {
        const ini = letras[0].x;
        const fin = letras[letras.length - 1].x + letras[letras.length - 1].w;
        x = izq + 3;
        if (ini - 3 - x >= 8) r = ini - 3;
        else x = fin + 3;
      }
    }
    if (o.modo === 'fill') {
      // Sobre la n-esima linea de ____ o de puntos del oficial, dentro de la celda. Se toma
      // del PDF oficial (en la sonda la marca reemplazo la linea y corrio lo que sigue).
      const lo = lineasOficial.find((q) => q.p === m.p && Math.abs(q.y - m.y) < 1);
      const izq = Number.isFinite(lim.izquierda) ? lim.izquierda : -Infinity;
      const der = Number.isFinite(lim.derecha) ? lim.derecha : Infinity;
      if (lo) {
        const cs = lo.chars.filter((ch) => ch.x > izq && ch.x < der);
        const runs = [];
        cs.forEach((ch, i) => {
          if (!/[_…]/.test(ch.ch) && !(ch.ch === '.' && runs.length && runs[runs.length - 1].abierto)) {
            if (runs.length) runs[runs.length - 1].abierto = false;
            return;
          }
          const u = runs[runs.length - 1];
          if (u && u.abierto) { u.fin = ch.x + ch.w; u.n++; } else runs.push({ ini: ch.x, fin: ch.x + ch.w, n: 1, abierto: true });
          if (i === cs.length - 1) runs[runs.length - 1].abierto = false;
        });
        const run = runs.filter((u) => u.n >= 3)[(o.n || 1) - 1];
        if (run) {
          // Puede usar tambien el blanco que sigue a la linea, hasta el texto siguiente.
          const sig = cs.find((ch) => ch.x >= run.fin && !/[\s_….]/.test(ch.ch) && ch.w > 0);
          x = run.ini + 1;
          r = Math.max(run.fin, sig ? sig.x - 1.5 : (Number.isFinite(der) ? der - 3 : run.fin));
        }
      }
    }
    // Ultima linea posible: sobre el borde inferior de la celda (con aire para las letras
    // que bajan: g, p, q). Si no hay borde, la ultima linea del parrafo final de la celda.
    const e = marcas[k + 'e'] || m;
    const b = Number.isFinite(lim.abajo) ? lim.abajo + 2 : (e.p === m.p ? Math.min(e.y, m.y) : m.y);
    campos[o.clave] = {
      p: m.p, x: +x.toFixed(1), y: m.y, x0: o.modo === 'prepend' || o.modo === 'fill' ? +x.toFixed(1) : m.x0,
      r: +r.toFixed(1),
      b: +Math.min(b, m.y).toFixed(1)
    };
  });
  if (faltan.length) throw new Error('Marcas no encontradas: ' + faltan.join(', '));

  const js = '// GENERADO por scripts/build-anamnesis-pdf-map.mjs — no editar a mano.\n' +
    '// Coordenadas (puntos PDF, origen abajo a la izquierda) de cada dato de la Anamnesis\n' +
    '// sobre el PDF oficial MINEDUC. p = pagina, (x, y) = donde empieza el dato, x0 = inicio\n' +
    '// de las lineas siguientes, r = borde derecho, b = ultima linea disponible.\n' +
    'window.ANAMNESIS_PDF_MAP = ' + JSON.stringify({ pagina: oficial.tam, campos }) + ';\n';
  fs.writeFileSync(SALIDA, js);
  console.log('Mapa escrito:', SALIDA, '| campos:', Object.keys(campos).length, '| paginas sonda:', sondaPdf.paginas);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'sonda' && arg) sonda(arg);
else if (cmd === 'mapa' && arg) await mapa(arg);
else console.log('Uso: node scripts/build-anamnesis-pdf-map.mjs sonda <salida.docx> | mapa <sonda.pdf>');
