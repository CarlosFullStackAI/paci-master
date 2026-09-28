/**
 * PIE MASTER - Rellena el Word OFICIAL de MINEDUC (no lo redibuja).
 *
 * Abre el .docx oficial (es un zip), escribe los datos del formulario en las celdas que
 * indica el `docx` de cada campo del schema (docs-registry.js), marca casillas y Sí/No,
 * y vuelve a comprimir. Todo lo demas del archivo (diseno, tablas, textos) queda intacto.
 * Ver specs/formatos-oficiales-rellenos.md.
 *
 * Navegador: requiere window.fflate (/vendor/fflate.js). Node (tests): require('fflate').
 */
(function (root) {
  const CASILLA_MARCADA = '<w:sym w:font="Wingdings" w:char="F0FE"/>';
  const RELLENO = /[_…]{3,}(?:[.…_]*[_…])?/g;

  const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 'AAAA-MM-DD' -> 'DD/MM/AAAA'; el resto queda igual.
  const formatoValor = (v) => {
    const s = String(v == null ? '' : v).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : s;
  };

  // Ubica cada celda del cuerpo: clave 't.r.c' (base 1) -> [inicio, fin] en el XML.
  function indexarCeldas(xml) {
    const celdas = {};
    const reTabla = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
    let t = 0;
    let mt;
    while ((mt = reTabla.exec(xml))) {
      t++;
      const baseT = mt.index;
      const reFila = /<w:tr[ >][\s\S]*?<\/w:tr>/g;
      let r = 0;
      let mr;
      while ((mr = reFila.exec(mt[0]))) {
        r++;
        const baseR = baseT + mr.index;
        const reCelda = /<w:tc>[\s\S]*?<\/w:tc>/g;
        let c = 0;
        let mc;
        while ((mc = reCelda.exec(mr[0]))) {
          c++;
          const ini = baseR + mc.index;
          celdas[t + '.' + r + '.' + c] = [ini, ini + mc[0].length];
        }
      }
    }
    return celdas;
  }

  // Propiedades de letra para el texto nuevo: las del ultimo run del parrafo (o las de la
  // marca de parrafo), sin negrita/cursiva/subrayado para que el dato no parezca etiqueta.
  function rprBase(parrafo, negrita) {
    const runs = parrafo.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || [];
    let rpr = '';
    for (let i = runs.length - 1; i >= 0 && !rpr; i--) {
      const m = runs[i].match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
      if (m) rpr = m[0];
    }
    if (!rpr) {
      const m = parrafo.match(/<w:pPr>[\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)[\s\S]*?<\/w:pPr>/);
      if (m) rpr = m[1];
    }
    rpr = rpr.replace(/<w:(b|bCs|i|iCs|caps)\/>/g, '').replace(/<w:(u|rStyle|highlight|shd) [^>]*\/>/g, '');
    if (negrita) rpr = rpr ? rpr.replace('<w:rPr>', '<w:rPr><w:b/>') : '<w:rPr><w:b/></w:rPr>';
    return rpr;
  }

  function run(texto, rpr) {
    const lineas = String(texto).split(/\r?\n/);
    const cuerpo = lineas.map((l, i) => (i ? '<w:br/>' : '') + '<w:t xml:space="preserve">' + escXml(l) + '</w:t>').join('');
    return '<w:r>' + rpr + cuerpo + '</w:r>';
  }

  // Parrafo donde se escribe: el ultimo con texto (la etiqueta) o, si la celda esta
  // vacia, el primero.
  function elegirParrafo(celda) {
    const re = /<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g;
    const ps = [];
    let m;
    while ((m = re.exec(celda))) ps.push({ ini: m.index, xml: m[0] });
    if (!ps.length) return null;
    const conTexto = ps.filter((p) => /<w:t[ >]/.test(p.xml));
    return conTexto.length ? conTexto[conTexto.length - 1] : ps[0];
  }

  // Recorta los espacios del final del parrafo (pueden venir repartidos en varios <w:t>).
  function quitarEspaciosFinales(px) {
    const reT = /(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g;
    const ts = [];
    let m;
    while ((m = reT.exec(px))) ts.push({ ini: m.index, len: m[0].length, abre: m[1], txt: m[2], cierra: m[3] });
    for (let i = ts.length - 1; i >= 0; i--) {
      const t = ts[i];
      const limpio = t.txt.replace(/\s+$/, '');
      if (limpio !== t.txt) px = px.slice(0, t.ini) + t.abre + limpio + t.cierra + px.slice(t.ini + t.len);
      if (limpio) break;
    }
    return px;
  }

  function escribir(celda, texto, modo, negrita) {
    const p = elegirParrafo(celda);
    if (!p) return celda;
    let px = p.xml === '<w:p/>' ? '<w:p></w:p>' : p.xml;
    const rpr = rprBase(px, negrita);
    if (modo === 'prepend') {
      // Los espacios con que el oficial empuja la palabra ("      años") se quitan para
      // que dato y palabra quepan juntos en la misma linea.
      px = px.replace(/(<w:t(?: [^>]*)?>)\s+/, '$1');
      const tras = px.match(/^<w:p[^>]*>(?:<w:pPr>[\s\S]*?<\/w:pPr>)?/)[0];
      px = tras + run(texto + ' ', rpr) + px.slice(tras.length);
    } else if (modo === 'marca') {
      // X junto a la palabra con espacio no separable: "No X" no se parte en dos lineas.
      px = quitarEspaciosFinales(px).replace(/<\/w:p>$/, run(' ' + texto, rpr) + '</w:p>');
    } else {
      // El oficial trae espacios en blanco al final de algunas lineas (lugar para escribir
      // a mano); se quitan para que el dato quede ahi y no salte a la linea siguiente.
      px = quitarEspaciosFinales(px);
      const sep = /<w:t[^>]*>[^<]*\S[^<]*<\/w:t>/.test(px) ? ' ' : '';
      px = px.replace(/<\/w:p>$/, run(sep + texto, rpr) + '</w:p>');
    }
    return celda.slice(0, p.ini) + px + celda.slice(p.ini + p.xml.length);
  }

  // Reemplaza la n-esima linea de puntos o guiones bajos por el dato (puede venir
  // repartida en varios <w:t>). Si no la encuentra, escribe al final de la celda.
  function rellenarLinea(celda, texto, n) {
    const reT = /(<w:t)((?: [^>]*)?>)([^<]*)(<\/w:t>)/g;
    const segs = [];
    let plano = '';
    let m;
    while ((m = reT.exec(celda))) {
      segs.push({ ini: m.index, len: m[0].length, abre: m[1], attr: m[2], txt: m[3], cierra: m[4], desde: plano.length });
      plano += m[3];
    }
    RELLENO.lastIndex = 0;
    let hallado = null;
    let k = 0;
    let mm;
    while ((mm = RELLENO.exec(plano))) {
      k++;
      if (k === n) { hallado = [mm.index, mm.index + mm[0].length]; break; }
    }
    if (!hallado) return escribir(celda, texto, 'append');
    let puesto = false;
    let out = celda;
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i];
      const a = Math.max(hallado[0], s.desde);
      const b = Math.min(hallado[1], s.desde + s.txt.length);
      if (a >= b) continue;
      const primero = segs.slice(0, i).every((o) => o.desde + o.txt.length <= hallado[0]);
      const nuevo = s.txt.slice(0, a - s.desde) + (primero ? ' ' + escXml(texto) + ' ' : '') + s.txt.slice(b - s.desde);
      if (primero) puesto = true;
      const attr = s.attr.includes('xml:space') ? s.attr : ' xml:space="preserve"' + s.attr;
      out = out.slice(0, s.ini) + s.abre + attr + nuevo + s.cierra + out.slice(s.ini + s.len);
    }
    return puesto ? out : escribir(celda, texto, 'append');
  }

  function marcarCasilla(celda, indice) {
    let k = -1;
    return celda.replace(/<w:sym [^>]*\/>/g, (s) => (++k === indice ? CASILLA_MARCADA : s));
  }

  const vacio = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

  // Traduce los datos del formulario a operaciones { celda: 't.r.c', fn }.
  function operaciones(schema, data) {
    const ops = [];
    const add = (at, fn, orden) => { if (at) ops.push({ celda: at.join('.'), fn, orden: orden || 0 }); };
    (schema.sections || []).forEach((sec) => sec.fields.forEach((f) => {
      const d = f.docx;
      const v = data[f.id];
      if (!d || vacio(v)) return;
      if (f.type === 'sino') {
        const at = v === 'Sí' ? d.si : v === 'No' ? d.no : null;
        add(at, (c) => escribir(c, 'X', 'marca', true));
      } else if (d.marks) {
        add(d.marks[v], (c) => escribir(c, 'X', 'marca', true));
      } else if (f.type === 'opciones') {
        const elegidas = Array.isArray(v) ? v : [v];
        elegidas.forEach((o) => {
          const i = f.options.indexOf(o);
          if (i >= 0) add(d.at, (c) => marcarCasilla(c, d.first + i));
        });
      } else if (f.type === 'tabla') {
        (Array.isArray(v) ? v : []).forEach((fila, ri) => {
          if (!fila || !d.cells[ri]) return;
          f.columns.forEach((col, ci) => {
            const val = formatoValor(fila[col.key]);
            if (val) add(d.cells[ri][ci], (c) => escribir(c, val, d.modes[ci]));
          });
        });
      } else {
        const val = formatoValor(v);
        if (!val) return;
        const fn = d.mode === 'fill' ? (c) => rellenarLinea(c, val, d.n) : (c) => escribir(c, val, d.mode);
        // Las lineas se rellenan de la ultima a la primera: si no, al rellenar la 1ª la
        // 2ª pasa a ser la 1ª y el conteo se corre.
        [d.at].concat(d.also || []).forEach((at) => add(at, fn, d.mode === 'fill' ? -d.n : 0));
      }
    }));
    return ops;
  }

  // Aplica las operaciones sobre word/document.xml, celda por celda desde el final del
  // archivo hacia el inicio (asi las posiciones de las celdas anteriores no se mueven).
  function rellenarXml(xml, schema, data) {
    const celdas = indexarCeldas(xml);
    const porCelda = {};
    operaciones(schema, data)
      .sort((a, b) => a.orden - b.orden)
      .forEach((op) => {
        if (!celdas[op.celda]) return;
        (porCelda[op.celda] = porCelda[op.celda] || []).push(op.fn);
      });
    Object.keys(porCelda)
      .sort((a, b) => celdas[b][0] - celdas[a][0])
      .forEach((k) => {
        const [ini, fin] = celdas[k];
        let celda = xml.slice(ini, fin);
        porCelda[k].forEach((fn) => { celda = fn(celda); });
        xml = xml.slice(0, ini) + celda + xml.slice(fin);
      });
    return xml;
  }

  function rellenarDocxOficial(bytes, schema, data, fflateLib) {
    const ff = fflateLib || root.fflate;
    const zip = ff.unzipSync(bytes);
    const xml = ff.strFromU8(zip['word/document.xml']);
    zip['word/document.xml'] = ff.strToU8(rellenarXml(xml, schema, data));
    return ff.zipSync(zip, { level: 6 });
  }

  // `interno` lo usa scripts/build-anamnesis-pdf-map.mjs para ubicar los datos en el PDF.
  const api = { rellenarDocxOficial, rellenarXml, indexarCeldas, formatoValor, interno: { escribir, rellenarLinea, rprBase } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FormatosOficiales = Object.assign(root.FormatosOficiales || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
