/**
 * PIE MASTER - Escribe los datos ENCIMA del PDF OFICIAL de MINEDUC (no lo redibuja).
 *
 * Usa el mapa de coordenadas generado por scripts/build-anamnesis-pdf-map.mjs y pdf-lib.
 * Regla (spec formatos-oficiales-rellenos): NUNCA se achica la letra. Si un texto no cabe
 * en su espacio, se escribe lo que cabe + "(continúa en anexo)" y el texto completo va en
 * una hoja anexa al final, con el mismo tamano de letra y el titulo del campo.
 *
 * Navegador: requiere window.PDFLib (cdnjs) y window.FormatosOficiales.formatoValor
 * (rellenar-docx.js). Node (tests): pasar las librerias como parametros.
 */
(function (root) {
  const TAM = 9;          // tamano de letra de los datos (pt)
  const INTERLINEA = 10.5;
  const TAM_X = 9;
  const AVISOS = [' (continúa en anexo)', ' (ver anexo)', ' (anexo)', ' *'];
  const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

  // Helvetica estandar solo trae WinAnsi: lo demas se reemplaza para que pdf-lib no falle.
  const limpiar = (s) => String(s).replace(/\t/g, ' ').replace(/\r/g, '')
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, (c) => (WIN_ANSI_EXTRA.includes(c) ? c : '?'));

  // Parte un parrafo en lineas: la primera mide `ancho1`, las demas `anchoN`.
  function partir(texto, font, ancho1, anchoN) {
    const lineas = [];
    // Si el primer renglon no tiene lugar ni para una letra, el texto parte en el siguiente.
    if (ancho1 < font.widthOfTextAtSize('MM', TAM)) lineas.push('');
    texto.split('\n').forEach((parrafo) => {
      let actual = '';
      const ancho = () => (lineas.length ? anchoN : ancho1);
      parrafo.split(/ +/).forEach((palabra) => {
        const prueba = actual ? actual + ' ' + palabra : palabra;
        if (font.widthOfTextAtSize(prueba, TAM) <= ancho()) { actual = prueba; return; }
        if (actual) { lineas.push(actual); actual = ''; }
        // Palabra mas larga que la linea: se corta por letras.
        let resto = palabra;
        while (resto.length > 1 && font.widthOfTextAtSize(resto, TAM) > ancho()) {
          let n = resto.length - 1;
          while (n > 1 && font.widthOfTextAtSize(resto.slice(0, n), TAM) > ancho()) n--;
          lineas.push(resto.slice(0, n));
          resto = resto.slice(n);
        }
        actual = resto;
      });
      lineas.push(actual);
    });
    return lineas;
  }

  // Escribe un texto en su lugar; devuelve false si no cupo completo (va al anexo).
  function escribirTexto(pagina, pos, texto, font, color) {
    const ancho1 = pos.r - pos.x;
    const anchoN = pos.r - pos.x0;
    const caben = Math.max(1, Math.floor((pos.y - pos.b) / INTERLINEA + 0.01) + 1);
    let lineas = partir(texto, font, ancho1, anchoN);
    let completo = true;
    if (lineas.length > caben) {
      completo = false;
      lineas = lineas.slice(0, caben);
      // La ultima linea deja espacio para el aviso de anexo (en espacios muy chicos se usa
      // una version corta del aviso para no pisar el texto vecino).
      const i = caben - 1;
      const disponible = i ? anchoN : ancho1;
      const aviso = AVISOS.find((a) => font.widthOfTextAtSize(a.trim(), TAM) <= disponible) || AVISOS[AVISOS.length - 1];
      const max = disponible - font.widthOfTextAtSize(aviso, TAM);
      let ultima = lineas[i];
      while (ultima && font.widthOfTextAtSize(ultima, TAM) > max) ultima = ultima.replace(/\s*\S+$/, '');
      lineas[i] = ultima ? ultima + aviso : aviso.trim();
    }
    lineas.forEach((l, i) => {
      if (!l) return;
      pagina.drawText(l, { x: i ? pos.x0 : pos.x, y: pos.y - i * INTERLINEA, size: TAM, font, color });
    });
    return completo;
  }

  function hojasAnexo(pdf, anexos, tam, font, bold, color, nombre) {
    const M = 56;
    let pagina = null;
    let y = 0;
    const nueva = () => {
      pagina = pdf.addPage([Number(tam[0]), Number(tam[1])]);
      y = tam[1] - M;
      pagina.drawText(limpiar('ANEXO — Entrevista a la familia / Anamnesis' + (nombre ? ' — ' + nombre : '')), { x: M, y, size: 10, font: bold, color });
      y -= 2 * INTERLINEA;
    };
    nueva();
    anexos.forEach((a) => {
      const lineas = partir(a.texto, font, tam[0] - 2 * M, tam[0] - 2 * M);
      if (y - (lineas.length + 1) * INTERLINEA < M && y < tam[1] - M - 3 * INTERLINEA) nueva();
      pagina.drawText(limpiar(a.titulo), { x: M, y, size: TAM, font: bold, color });
      y -= INTERLINEA;
      lineas.forEach((l) => {
        if (y < M) nueva();
        pagina.drawText(l, { x: M, y, size: TAM, font, color });
        y -= INTERLINEA;
      });
      y -= INTERLINEA / 2;
    });
  }

  async function rellenarPdfOficial(bytes, schema, data, mapa, libs) {
    const L = (libs && libs.PDFLib) || root.PDFLib;
    const formatoValor = (libs && libs.formatoValor) || root.FormatosOficiales.formatoValor;
    const pdf = await L.PDFDocument.load(bytes);
    const font = await pdf.embedFont(L.StandardFonts.Helvetica);
    const bold = await pdf.embedFont(L.StandardFonts.HelveticaBold);
    const color = L.rgb(0.05, 0.1, 0.35);
    const paginas = pdf.getPages();
    const C = mapa.campos;
    const anexos = [];
    const pag = (pos) => paginas[pos.p - 1];

    const marcarX = (pos) => { if (pos) pag(pos).drawText('X', { x: pos.x, y: pos.y, size: TAM_X, font: bold, color }); };
    const marcarCasilla = (pos) => {
      if (!pos) return;
      const w = bold.widthOfTextAtSize('X', TAM_X);
      pag(pos).drawText('X', { x: pos.x + (pos.w - w) / 2, y: pos.y + pos.h * 0.08, size: TAM_X, font: bold, color });
    };
    const texto = (clave, valor, titulo) => {
      const pos = C[clave];
      const v = limpiar(formatoValor(valor)).trim();
      if (!pos || !v) return;
      const cupo = escribirTexto(pag(pos), pos, v, font, color);
      if (!cupo && !anexos.some((a) => a.titulo === titulo && a.texto === v)) anexos.push({ titulo, texto: v });
    };

    (schema.sections || []).forEach((sec) => sec.fields.forEach((f) => {
      const v = data[f.id];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
      const titulo = sec.label + ' — ' + f.label;
      if (f.type === 'sino' || (f.docx && f.docx.marks)) marcarX(C[f.id + ':' + v]);
      else if (f.type === 'opciones') (Array.isArray(v) ? v : [v]).forEach((o) => marcarCasilla(C[f.id + ':' + o]));
      else if (f.type === 'tabla') {
        (Array.isArray(v) ? v : []).forEach((fila, r) => f.columns.forEach((c) =>
          texto(f.id + '.' + r + '.' + c.key, (fila || {})[c.key], titulo + ' — fila ' + (r + 1) + ', ' + c.label)));
      } else {
        texto(f.id, v, titulo);
        ((f.docx && f.docx.also) || []).forEach((_, i) => texto(f.id + '@' + (i + 1), v, titulo));
      }
    }));

    if (anexos.length) hojasAnexo(pdf, anexos, mapa.pagina, font, bold, color, limpiar(data.student_name || ''));
    return pdf.save();
  }

  const api = { rellenarPdfOficial };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FormatosOficiales = Object.assign(root.FormatosOficiales || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
