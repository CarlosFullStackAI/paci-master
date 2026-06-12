// Buscador de establecimientos MINEDUC (autocompletado reutilizable).
// Fuente: /api/mineduc/establecimientos?q= (directorio oficial en D1).
// Uso:
//   initEstablecimientoSearch(inputEl, {
//     onSelect: (est) => { ... }   // est: {rbd, dgv, nombre, region, comuna, dependencia, rural, convenio_pie, matricula}
//   });
// Si no se pasa onSelect, rellena el propio input con el nombre oficial.
(function () {
  'use strict';

  let stylesReady = false;
  function ensureStyles() {
    if (stylesReady) return;
    stylesReady = true;
    const css = [
      '.ee-ac-wrap { position: relative; }',
      '.ee-ac-list {',
      '  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 99999;',
      '  background: #0e1730; border: 1px solid rgba(56,189,248,0.35); border-radius: 0.6rem;',
      '  box-shadow: 0 18px 50px rgba(2,6,23,0.6); overflow: hidden; max-height: 320px; overflow-y: auto;',
      '}',
      '.ee-ac-item { padding: 0.55rem 0.8rem; cursor: pointer; border-top: 1px solid rgba(148,163,184,0.08); }',
      '.ee-ac-item:first-child { border-top: none; }',
      '.ee-ac-item:hover, .ee-ac-item.active { background: rgba(56,189,248,0.12); }',
      '.ee-ac-nombre { font-size: 0.82rem; font-weight: 700; color: #e2e8f0; }',
      '.ee-ac-sub { font-size: 0.68rem; color: #94a3b8; margin-top: 1px; }',
      '.ee-ac-pie {',
      '  display: inline-block; background: rgba(52,211,153,0.15); color: #34d399;',
      '  border: 1px solid rgba(52,211,153,0.35); font-size: 0.58rem; font-weight: 800;',
      '  padding: 0 0.4rem; border-radius: 999px; margin-left: 0.4rem; vertical-align: middle;',
      '}',
      '.ee-ac-empty { padding: 0.7rem 0.8rem; font-size: 0.75rem; color: #94a3b8; }'
    ].join('\n');
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.initEstablecimientoSearch = function (input, opts) {
    if (!input || input.dataset.eeAcReady) return;
    input.dataset.eeAcReady = '1';
    ensureStyles();
    opts = opts || {};

    // Envolver el input para posicionar el dropdown
    const wrap = document.createElement('div');
    wrap.className = 'ee-ac-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const list = document.createElement('div');
    list.className = 'ee-ac-list';
    list.style.display = 'none';
    wrap.appendChild(list);

    let timer = null;
    let resultados = [];
    let activeIdx = -1;
    let ultimaQ = '';

    function cerrar() { list.style.display = 'none'; activeIdx = -1; }

    function seleccionar(est) {
      cerrar();
      if (typeof opts.onSelect === 'function') {
        opts.onSelect(est);
      } else {
        input.value = est.nombre;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    function render() {
      if (!resultados.length) {
        list.innerHTML = '<div class="ee-ac-empty">Sin coincidencias en el directorio MINEDUC.</div>';
        list.style.display = 'block';
        return;
      }
      list.innerHTML = resultados.map(function (e, i) {
        return '<div class="ee-ac-item' + (i === activeIdx ? ' active' : '') + '" data-i="' + i + '">' +
          '<div class="ee-ac-nombre">' + escHtml(e.nombre) +
            (e.convenio_pie ? '<span class="ee-ac-pie">PIE</span>' : '') + '</div>' +
          '<div class="ee-ac-sub">RBD ' + escHtml(e.rbd) + '-' + escHtml(e.dgv) + ' · ' + escHtml(e.comuna) + ', ' + escHtml(e.region) +
            (e.dependencia ? ' · ' + escHtml(e.dependencia) : '') + '</div>' +
        '</div>';
      }).join('');
      list.style.display = 'block';
      Array.prototype.forEach.call(list.querySelectorAll('.ee-ac-item'), function (el) {
        el.addEventListener('mousedown', function (ev) {
          ev.preventDefault(); // no perder el foco antes del click
          seleccionar(resultados[parseInt(el.dataset.i, 10)]);
        });
      });
    }

    async function buscar(q) {
      ultimaQ = q;
      try {
        const res = await fetch('/api/mineduc/establecimientos?q=' + encodeURIComponent(q), { credentials: 'same-origin' });
        const data = await res.json();
        if (q !== ultimaQ) return; // llegó tarde, hay otra búsqueda en curso
        resultados = (data && data.resultados) || [];
        activeIdx = -1;
        render();
      } catch (e) { cerrar(); }
    }

    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', function () {
      const q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 2) { cerrar(); return; }
      timer = setTimeout(function () { buscar(q); }, 300);
    });
    input.addEventListener('keydown', function (ev) {
      if (list.style.display === 'none') return;
      if (ev.key === 'ArrowDown') { ev.preventDefault(); activeIdx = Math.min(activeIdx + 1, resultados.length - 1); render(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); render(); }
      else if (ev.key === 'Enter' && activeIdx >= 0) { ev.preventDefault(); seleccionar(resultados[activeIdx]); }
      else if (ev.key === 'Escape') { cerrar(); }
    });
    input.addEventListener('blur', function () { setTimeout(cerrar, 150); });
  };
})();
