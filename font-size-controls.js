// Control de tamaño de letra (accesibilidad) — componente compartido.
// Inyecta una pastilla flotante (abajo-izquierda) con dos grupos:
//   - Pantalla (A-/A+): escala la tipografia base de la pagina (html font-size %,
//     las clases rem de Tailwind crecen proporcionalmente). Aplica en todas las
//     paginas que incluyan este script y se recuerda en el navegador.
//   - Documento (A-/A+): solo si la pagina tiene #documento (editores PACI/PAI/docs).
//     Aplica CSS zoom al documento; como el PDF server-side se genera desde el
//     outerHTML de #documento (estilos inline incluidos), el tamano elegido sale
//     igual en vista previa, impresion y PDF descargado.
// La pastilla se oculta al imprimir y NO forma parte de #documento.
(function () {
  'use strict';

  var UI_KEY = 'paci_ui_font';
  var DOC_KEY = 'paci_doc_zoom';
  var FONT_KEY = 'paci_doc_fuente';
  var OPEN_KEY = 'paci_fsc_open';   // pastilla desplegada ('1') o solo el boton Aa ('0', defecto)
  var UI_STEPS = [100, 110, 120, 130];   // % tipografia base de la interfaz
  var DOC_STEPS = [85, 100, 115, 130, 145];   // % zoom del documento (PDF via page.pdf scale)

  // Tipografias del documento (todas gratis). Las de sistema no requieren carga;
  // las de Google Fonts (Merriweather/Atkinson) se cargan bajo demanda y la CSP
  // del sitio ya permite fonts.googleapis.com / fonts.gstatic.com.
  var FUENTES = {
    merriweather: { label: 'Merriweather (clásica)', stack: "'Merriweather', Georgia, 'Times New Roman', serif", google: 'Merriweather:wght@300;400;700;900' },
    arial:        { label: 'Arial (moderna)',        stack: 'Arial, Helvetica, sans-serif', google: null },
    times:        { label: 'Times New Roman',        stack: "'Times New Roman', Times, serif", google: null },
    atkinson:     { label: 'Atkinson (alta legibilidad)', stack: "'Atkinson Hyperlegible', Arial, sans-serif", google: 'Atkinson+Hyperlegible:wght@400;700' }
  };

  function fuenteActualKey() {
    var k = localStorage.getItem(FONT_KEY);
    return FUENTES[k] ? k : 'merriweather';
  }

  // Carga la hoja de Google Fonts de una fuente si aún no está en la página.
  function asegurarFuenteCargada(key) {
    var f = FUENTES[key];
    if (!f || !f.google) return;
    var id = 'fsc-font-' + key;
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + f.google + '&display=swap';
    document.head.appendChild(link);
  }

  function leer(key, def) {
    var v = parseFloat(localStorage.getItem(key));
    return isNaN(v) ? def : v;
  }

  function paso(steps, actual, delta) {
    var i = steps.indexOf(actual);
    if (i === -1) i = steps.indexOf(100);
    i = Math.min(steps.length - 1, Math.max(0, i + delta));
    return steps[i];
  }

  function aplicarUI() {
    var pct = leer(UI_KEY, 100);
    if (UI_STEPS.indexOf(pct) === -1) pct = 100;
    document.documentElement.style.fontSize = (pct === 100) ? '' : (pct + '%');
  }

  function aplicarDoc() {
    var el = document.getElementById('documento');
    if (!el) return;
    var pct = leer(DOC_KEY, 100);
    if (DOC_STEPS.indexOf(pct) === -1) pct = 100;
    // zoom (Chromium/Firefox modernos): escala texto y espaciado en pantalla,
    // impresion y en el PDF de Puppeteer. Se limpia cuando vuelve a 100%.
    el.style.zoom = (pct === 100) ? '' : String(pct / 100);
  }

  // Aplica la fuente elegida al documento: fontFamily inline (vista previa) y la
  // variable --doc-font, que el CSS de impresión de paci.css usa como fuente del
  // print/PDF. Ambos viajan en el outerHTML que consume el PDF server-side.
  function aplicarFuente() {
    var el = document.getElementById('documento');
    if (!el) return;
    var key = fuenteActualKey();
    asegurarFuenteCargada(key);
    if (key === 'merriweather') {
      el.style.removeProperty('--doc-font');
      el.style.fontFamily = '';
    } else {
      el.style.setProperty('--doc-font', FUENTES[key].stack);
      el.style.fontFamily = FUENTES[key].stack;
    }
  }

  function refrescar() {
    var ui = document.getElementById('fsc-ui-pct');
    if (ui) ui.textContent = leer(UI_KEY, 100) + '%';
    var docPct = leer(DOC_KEY, 100) + '%';
    var dc = document.getElementById('fsc-doc-pct');
    if (dc) dc.textContent = docPct;
    // Contadores adicionales en los paneles de los editores (clase compartida).
    var outs = document.querySelectorAll('.fsc-doc-pct-out');
    for (var i = 0; i < outs.length; i++) outs[i].textContent = docPct;
    // Selects de tipografía de los paneles (clase compartida).
    var sels = document.querySelectorAll('.fsc-doc-font');
    for (var j = 0; j < sels.length; j++) sels[j].value = fuenteActualKey();
  }

  // Cambia el tipo de letra del documento (lo llaman los selects de los editores).
  window.docFontSet = function (key) {
    if (!FUENTES[key]) key = 'merriweather';
    localStorage.setItem(FONT_KEY, key);
    aplicarFuente();
    refrescar();
    if (typeof window.updatePreview === 'function') { try { window.updatePreview(); } catch (e) {} }
  };

  // Fuente actual: la usan pai.html/docs.html para construir el HTML del PDF/Word,
  // y app.html para incluir la hoja de Google Fonts correcta en el PDF.
  window.docFontActual = function () {
    var key = fuenteActualKey();
    return { key: key, stack: FUENTES[key].stack, google: FUENTES[key].google, label: FUENTES[key].label };
  };

  // Factor de zoom actual del documento (1 = 100%). Lo usan los editores que
  // construyen el HTML del PDF aparte de #documento (pai.html, docs.html) para
  // que el tamano elegido tambien salga en el PDF/impresion server-side.
  window.docZoomActual = function () {
    var pct = leer(DOC_KEY, 100);
    if (DOC_STEPS.indexOf(pct) === -1) pct = 100;
    return pct / 100;
  };

  window.uiFontStep = function (delta) {
    localStorage.setItem(UI_KEY, String(paso(UI_STEPS, leer(UI_KEY, 100), delta)));
    aplicarUI();
    refrescar();
  };

  // Volver el zoom del documento a 100% (boton "Restablecer tamaños" de los editores).
  window.docZoomReset = function () {
    localStorage.setItem(DOC_KEY, '100');
    aplicarDoc();
    refrescar();
  };

  window.docZoomStep = function (delta) {
    localStorage.setItem(DOC_KEY, String(paso(DOC_STEPS, leer(DOC_KEY, 100), delta)));
    aplicarDoc();
    refrescar();
    // Refrescar la vista previa si el editor expone updatePreview (no es necesario
    // para el zoom en si, pero mantiene coherente cualquier calculo de layout).
    if (typeof window.updatePreview === 'function') { try { window.updatePreview(); } catch (e) {} }
  };

  function ensureStyles() {
    var css = [
      // Contenedor: boton circular "Aa" + panel desplegable. Colapsado por defecto
      // para que NUNCA tape el contenido de la pagina.
      '#fsc-pill { position: fixed; left: 12px; bottom: 12px; z-index: 9000;',
      '  display: flex; align-items: center; user-select: none; font-family: inherit; }',
      '#fsc-toggle { width: 42px; height: 42px; border-radius: 50%; border: none; cursor: pointer; flex: none;',
      '  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: #fff;',
      '  font-weight: 800; font-size: 14px; letter-spacing: -0.5px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  box-shadow: 0 8px 24px rgba(2,6,23,0.45), 0 0 0 1px rgba(148,163,184,0.25);',
      '  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease; }',
      '#fsc-toggle:hover { transform: scale(1.08); box-shadow: 0 10px 28px rgba(14,165,233,0.5), 0 0 0 1px rgba(148,163,184,0.35); }',
      '#fsc-pill.fsc-open #fsc-toggle { filter: saturate(0.55) brightness(0.85); }',
      '#fsc-controls { display: none; align-items: stretch; gap: 0.9rem; margin-left: 10px;',
      '  background: rgba(15,23,42,0.95); color: #e2e8f0;',
      '  border: 1px solid rgba(56,189,248,0.3); border-radius: 16px;',
      '  padding: 8px 14px; font-size: 11px;',
      '  box-shadow: 0 12px 32px rgba(2,6,23,0.5); backdrop-filter: blur(8px); }',
      '#fsc-pill.fsc-open #fsc-controls { display: flex; animation: fsc-pop 0.22s ease; }',
      '@keyframes fsc-pop { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }',
      '#fsc-controls .fsc-group { display: flex; flex-direction: column; align-items: center; gap: 3px; }',
      '#fsc-controls .fsc-cap { font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #7dd3fc; white-space: nowrap; }',
      '#fsc-controls .fsc-cap i { font-size: 8.5px; margin-right: 2px; opacity: 0.8; }',
      '#fsc-controls .fsc-row { display: flex; align-items: center; gap: 5px; }',
      '#fsc-controls .fsc-sep { width: 1px; align-self: stretch;',
      '  background: linear-gradient(rgba(148,163,184,0), rgba(148,163,184,0.45), rgba(148,163,184,0)); }',
      '#fsc-controls .fsc-pct { min-width: 36px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }',
      '#fsc-controls button { width: 22px; height: 22px; border-radius: 50%; border: none; cursor: pointer;',
      '  background: rgba(255,255,255,0.12); color: #e2e8f0; font-weight: 800; font-size: 12px;',
      '  line-height: 1; display: flex; align-items: center; justify-content: center; padding: 0;',
      '  transition: background 0.15s ease, transform 0.15s ease; }',
      '#fsc-controls button:hover { background: rgba(56,189,248,0.5); transform: scale(1.1); }',
      '@media print { #fsc-pill { display: none !important; } }'
    ].join('\n');
    var el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function inyectarPill() {
    if (document.getElementById('fsc-pill')) return;
    if (!document.body) return;
    ensureStyles();
    var conDoc = !!document.getElementById('documento');
    var abierto = localStorage.getItem(OPEN_KEY) === '1';
    var pill = document.createElement('div');
    pill.id = 'fsc-pill';
    pill.setAttribute('role', 'group');
    pill.setAttribute('aria-label', 'Tamaño de letra');
    if (abierto) pill.className = 'fsc-open';
    pill.innerHTML =
      '<button type="button" id="fsc-toggle" title="Tamaño de letra" aria-expanded="' + (abierto ? 'true' : 'false') + '"' +
        ' aria-label="Mostrar u ocultar los controles de tamaño de letra">Aa</button>' +
      '<div id="fsc-controls">' +
        '<div class="fsc-group" title="Tamaño de letra de la plataforma (menús y formularios)">' +
          '<span class="fsc-cap"><i class="fa-solid fa-display" aria-hidden="true"></i>Pantalla</span>' +
          '<div class="fsc-row">' +
            '<button type="button" onclick="uiFontStep(-1)" aria-label="Reducir letra de la plataforma">−</button>' +
            '<span class="fsc-pct" id="fsc-ui-pct">100%</span>' +
            '<button type="button" onclick="uiFontStep(1)" aria-label="Aumentar letra de la plataforma">+</button>' +
          '</div>' +
        '</div>' +
        (conDoc
          ? '<div class="fsc-sep" aria-hidden="true"></div>' +
            '<div class="fsc-group" title="Tamaño de letra del documento (vista previa, impresión y PDF)">' +
              '<span class="fsc-cap"><i class="fa-solid fa-file-lines" aria-hidden="true"></i>Documento</span>' +
              '<div class="fsc-row">' +
                '<button type="button" onclick="docZoomStep(-1)" aria-label="Reducir letra del documento">−</button>' +
                '<span class="fsc-pct" id="fsc-doc-pct">100%</span>' +
                '<button type="button" onclick="docZoomStep(1)" aria-label="Aumentar letra del documento">+</button>' +
              '</div>' +
            '</div>'
          : '') +
      '</div>';
    document.body.appendChild(pill);
    var toggle = document.getElementById('fsc-toggle');
    toggle.addEventListener('click', function () {
      var open = pill.classList.toggle('fsc-open');
      localStorage.setItem(OPEN_KEY, open ? '1' : '0');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    refrescar();
  }

  // Aplicar la preferencia de interfaz apenas carga el script (va en <head>,
  // documentElement ya existe) para evitar el parpadeo de tamano.
  aplicarUI();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { aplicarDoc(); aplicarFuente(); inyectarPill(); });
  } else {
    aplicarDoc();
    aplicarFuente();
    inyectarPill();
  }
})();
