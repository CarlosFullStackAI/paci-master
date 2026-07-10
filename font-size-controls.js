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
  var UI_STEPS = [100, 110, 120, 130];   // % tipografia base de la interfaz
  var DOC_STEPS = [85, 100, 115, 130, 145];   // % zoom del documento (PDF via page.pdf scale)

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

  function refrescar() {
    var ui = document.getElementById('fsc-ui-pct');
    if (ui) ui.textContent = leer(UI_KEY, 100) + '%';
    var docPct = leer(DOC_KEY, 100) + '%';
    var dc = document.getElementById('fsc-doc-pct');
    if (dc) dc.textContent = docPct;
    // Contadores adicionales en los paneles de los editores (clase compartida).
    var outs = document.querySelectorAll('.fsc-doc-pct-out');
    for (var i = 0; i < outs.length; i++) outs[i].textContent = docPct;
  }

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
      '#fsc-pill { position: fixed; left: 12px; bottom: 12px; z-index: 9000;',
      '  display: flex; align-items: center; gap: 0.55rem;',
      '  background: rgba(15,23,42,0.92); color: #e2e8f0;',
      '  border: 1px solid rgba(148,163,184,0.35); border-radius: 999px;',
      '  padding: 5px 10px; font-size: 11px; font-family: inherit;',
      '  box-shadow: 0 8px 24px rgba(2,6,23,0.35); user-select: none; }',
      '#fsc-pill .fsc-group { display: flex; align-items: center; gap: 4px; }',
      '#fsc-pill .fsc-sep { width: 1px; height: 16px; background: rgba(148,163,184,0.4); }',
      '#fsc-pill i { font-size: 11px; opacity: 0.75; }',
      '#fsc-pill .fsc-pct { min-width: 34px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }',
      '#fsc-pill button { width: 22px; height: 22px; border-radius: 50%; border: none; cursor: pointer;',
      '  background: rgba(255,255,255,0.14); color: #e2e8f0; font-weight: 800; font-size: 12px;',
      '  line-height: 1; display: flex; align-items: center; justify-content: center; padding: 0; }',
      '#fsc-pill button:hover { background: rgba(56,189,248,0.4); }',
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
    var pill = document.createElement('div');
    pill.id = 'fsc-pill';
    pill.setAttribute('role', 'group');
    pill.setAttribute('aria-label', 'Tamaño de letra');
    pill.innerHTML =
      '<div class="fsc-group" title="Tamaño de letra de la plataforma (menús y formularios)">' +
        '<i class="fa-solid fa-display" aria-hidden="true"></i>' +
        '<button type="button" onclick="uiFontStep(-1)" aria-label="Reducir letra de la plataforma">−</button>' +
        '<span class="fsc-pct" id="fsc-ui-pct">100%</span>' +
        '<button type="button" onclick="uiFontStep(1)" aria-label="Aumentar letra de la plataforma">+</button>' +
      '</div>' +
      (conDoc
        ? '<div class="fsc-sep" aria-hidden="true"></div>' +
          '<div class="fsc-group" title="Tamaño de letra del documento (vista previa, impresión y PDF)">' +
            '<i class="fa-solid fa-file-lines" aria-hidden="true"></i>' +
            '<button type="button" onclick="docZoomStep(-1)" aria-label="Reducir letra del documento">−</button>' +
            '<span class="fsc-pct" id="fsc-doc-pct">100%</span>' +
            '<button type="button" onclick="docZoomStep(1)" aria-label="Aumentar letra del documento">+</button>' +
          '</div>'
        : '');
    document.body.appendChild(pill);
    refrescar();
  }

  // Aplicar la preferencia de interfaz apenas carga el script (va en <head>,
  // documentElement ya existe) para evitar el parpadeo de tamano.
  aplicarUI();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { aplicarDoc(); inyectarPill(); });
  } else {
    aplicarDoc();
    inyectarPill();
  }
})();
