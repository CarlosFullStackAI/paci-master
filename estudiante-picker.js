// Selector de estudiantes de la base del colegio (componente reutilizable).
// Extraido del picker que vivia inline en docs.html, para compartirlo con los
// editores PACI (app.html) y PAI (pai.html).
// Fuente: POST /api/students/list (estudiantes del establecimiento del usuario).
// Uso:
//   abrirSelectorEstudiante({
//     onSelect: (student) => { ... }  // student: fila completa de /api/students/list
//   });
// Tema: usa data-theme del <html> (todas las paginas lo setean al cargar);
// oscuro por defecto + overrides [data-theme="light"], igual que docs.html.
(function () {
  'use strict';

  let stylesReady = false;
  function ensureStyles() {
    if (stylesReady) return;
    stylesReady = true;
    const css = [
      '.ep-overlay { position: fixed; inset: 0; background: rgba(2,6,23,0.65); backdrop-filter: blur(6px);',
      '  z-index: 9500; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }',
      '.ep-modal { background: #0f172a; border: 1px solid rgba(56,189,248,0.25); border-radius: 1.25rem;',
      '  width: 100%; max-width: 620px; max-height: 85vh; box-shadow: 0 30px 80px rgba(0,0,0,0.55);',
      '  display: flex; flex-direction: column; overflow: hidden; }',
      '[data-theme="light"] .ep-modal { background: #ffffff; border-color: #e2e8f0; box-shadow: 0 30px 80px rgba(15,23,42,0.2); }',
      '.ep-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(56,189,248,0.15);',
      '  display: flex; justify-content: space-between; align-items: center; }',
      '[data-theme="light"] .ep-header { border-bottom-color: #e2e8f0; }',
      '.ep-header h3 { font-size: 1.05rem; font-weight: 800; color: #f1f5f9; margin: 0; }',
      '[data-theme="light"] .ep-header h3 { color: #0f172a; }',
      '.ep-close { background: none; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer; padding: 0.3rem; }',
      '.ep-close:hover { color: #f1f5f9; }',
      '[data-theme="light"] .ep-close:hover { color: #0f172a; }',
      '.ep-filters { padding: 1rem 1.5rem 0.75rem; display: grid; gap: 0.65rem; }',
      '.ep-filters input, .ep-filters select { width: 100%; background: rgba(2,6,23,0.5); color: #f1f5f9;',
      '  border: 1px solid rgba(56,189,248,0.2); border-radius: 0.6rem; padding: 0.6rem 0.8rem; font-size: 0.85rem; outline: none; }',
      '.ep-filters input:focus, .ep-filters select:focus { border-color: rgba(56,189,248,0.55); }',
      '[data-theme="light"] .ep-filters input, [data-theme="light"] .ep-filters select {',
      '  background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }',
      '.ep-list { flex: 1; overflow-y: auto; padding: 0.5rem 1.5rem 1.5rem; }',
      '.ep-group { margin-bottom: 1rem; }',
      '.ep-group-label { font-size: 0.7rem; font-weight: 800; color: #38bdf8; text-transform: uppercase;',
      '  letter-spacing: 0.06em; padding: 0.5rem 0; margin-bottom: 0.35rem; border-bottom: 1px dashed rgba(56,189,248,0.25); }',
      '[data-theme="light"] .ep-group-label { color: #1d4ed8; border-bottom-color: #cbd5e1; }',
      '.ep-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 0.8rem; border-radius: 0.7rem;',
      '  cursor: pointer; background: rgba(15,23,42,0.4); border: 1px solid rgba(56,189,248,0.08);',
      '  transition: all 0.2s; margin-bottom: 0.35rem; }',
      '.ep-item:hover { background: rgba(56,189,248,0.12); border-color: rgba(56,189,248,0.4); transform: translateX(3px); }',
      '[data-theme="light"] .ep-item { background: #f8fafc; border-color: #e2e8f0; }',
      '[data-theme="light"] .ep-item:hover { background: #dbeafe; border-color: #93c5fd; }',
      '.ep-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #38bdf8, #818cf8);',
      '  color: #020617; font-weight: 800; display: flex; align-items: center; justify-content: center;',
      '  font-size: 0.85rem; flex-shrink: 0; }',
      '.ep-info { flex: 1; min-width: 0; }',
      '.ep-name { font-weight: 800; font-size: 0.88rem; color: #f1f5f9; }',
      '[data-theme="light"] .ep-name { color: #0f172a; }',
      '.ep-meta { font-size: 0.72rem; color: #94a3b8; }',
      '[data-theme="light"] .ep-meta { color: #475569; }',
      '.ep-empty { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.85rem; }'
    ].join('\n');
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  let allStudents = [];
  let currentOnSelect = null;

  function cerrar() {
    const o = document.getElementById('ep-overlay');
    if (o) o.style.display = 'none';
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(ev) {
    if (ev.key === 'Escape') cerrar();
  }

  function elegir(sid) {
    const s = allStudents.find(st => st.id === sid);
    cerrar();
    if (s && typeof currentOnSelect === 'function') currentOnSelect(s);
  }

  function renderLista() {
    const list = document.getElementById('ep-list');
    if (!list) return;
    const q = (document.getElementById('ep-search')?.value || '').trim().toLowerCase();
    const cursoFilter = document.getElementById('ep-curso-filter')?.value || '';

    let pool = allStudents.slice();
    if (cursoFilter) {
      pool = pool.filter(s => ((s.curso || '').trim() || '— sin curso —') === cursoFilter);
    }
    if (q) {
      pool = pool.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.rut || '').toLowerCase().includes(q) ||
        (s.diagnosis || '').toLowerCase().includes(q) ||
        (s.curso || '').toLowerCase().includes(q)
      );
    }

    if (!pool.length) {
      list.innerHTML = '<div class="ep-empty"><i class="fa-solid fa-magnifying-glass" style="opacity:0.5;display:block;margin-bottom:0.5rem;"></i>Sin coincidencias. Crea estudiantes desde el dashboard o los editores.</div>';
      return;
    }

    // Agrupar por curso
    const groups = {};
    pool.forEach(s => {
      const c = (s.curso || '').trim() || '— sin curso —';
      if (!groups[c]) groups[c] = [];
      groups[c].push(s);
    });

    list.innerHTML = Object.keys(groups).sort().map(curso => {
      const items = groups[curso].map(s => {
        const initial = (s.name || '?').charAt(0).toUpperCase();
        const metaParts = [];
        if (s.rut) metaParts.push(s.rut);
        if (s.diagnosis) metaParts.push(s.diagnosis);
        if (s.work_level) metaParts.push('Nivel ' + s.work_level);
        return '<div class="ep-item" data-sid="' + s.id + '">' +
          '<div class="ep-avatar">' + esc(initial) + '</div>' +
          '<div class="ep-info">' +
            '<div class="ep-name">' + esc(s.name || '—') + '</div>' +
            '<div class="ep-meta">' + esc(metaParts.join(' · ')) + '</div>' +
          '</div>' +
          '<i class="fa-solid fa-chevron-right" style="opacity:0.4;font-size:0.75rem;"></i>' +
          '</div>';
      }).join('');
      return '<div class="ep-group">' +
        '<div class="ep-group-label"><i class="fa-solid fa-school"></i> ' + esc(curso) + ' (' + groups[curso].length + ')</div>' +
        items +
        '</div>';
    }).join('');

    Array.prototype.forEach.call(list.querySelectorAll('.ep-item'), el => {
      el.addEventListener('click', () => elegir(parseInt(el.dataset.sid, 10)));
    });
  }

  async function cargarYRender() {
    try {
      const token = localStorage.getItem('paci_token');
      const res = await fetch('/api/students/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _token: token })
      });
      const data = await res.json();
      allStudents = data.ok ? (data.students || []) : [];

      // Llenar dropdown de cursos
      const cursos = [...new Set(allStudents.map(s => (s.curso || '').trim() || '— sin curso —'))].sort();
      const sel = document.getElementById('ep-curso-filter');
      if (sel) {
        sel.innerHTML = '<option value="">Todos los cursos (' + allStudents.length + ')</option>' +
          cursos.map(c => {
            const count = allStudents.filter(s => ((s.curso || '').trim() || '— sin curso —') === c).length;
            return '<option value="' + esc(c) + '">' + esc(c) + ' (' + count + ')</option>';
          }).join('');
      }

      renderLista();
    } catch (e) {
      const list = document.getElementById('ep-list');
      if (list) list.innerHTML = '<div class="ep-empty">Error de conexión al cargar la base.</div>';
    }
  }

  window.abrirSelectorEstudiante = function (opts) {
    opts = opts || {};
    currentOnSelect = opts.onSelect || null;
    ensureStyles();

    let overlay = document.getElementById('ep-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      const search = document.getElementById('ep-search');
      if (search) search.value = '';
      document.addEventListener('keydown', onKeydown);
      cargarYRender();
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'ep-overlay';
    overlay.className = 'ep-overlay';
    overlay.innerHTML =
      '<div class="ep-modal">' +
        '<div class="ep-header">' +
          '<h3><i class="fa-solid fa-database" style="color:#34d399;margin-right:0.45rem;"></i>Mis estudiantes</h3>' +
          '<button type="button" class="ep-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="ep-filters">' +
          '<input type="text" id="ep-search" placeholder="Buscar por nombre, RUT, diagnóstico o curso...">' +
          '<select id="ep-curso-filter"><option value="">Todos los cursos</option></select>' +
        '</div>' +
        '<div class="ep-list" id="ep-list">' +
          '<div class="ep-empty"><i class="fa-solid fa-spinner fa-spin"></i> Cargando estudiantes…</div>' +
        '</div>' +
      '</div>';
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) cerrar(); });
    overlay.querySelector('.ep-close').addEventListener('click', cerrar);
    document.body.appendChild(overlay);

    document.getElementById('ep-search').addEventListener('input', renderLista);
    document.getElementById('ep-curso-filter').addEventListener('change', renderLista);
    document.addEventListener('keydown', onKeydown);

    cargarYRender();
  };

  window.cerrarSelectorEstudiante = cerrar;
})();
