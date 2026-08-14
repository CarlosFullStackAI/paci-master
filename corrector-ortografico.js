// Corrector ortográfico (componente compartido).
// Activa el corrector NATIVO del navegador (subrayado rojo + sugerencias con
// clic derecho, diccionario español) en los campos de TEXTO LIBRE:
//   - Todos los <textarea> (observaciones, justificaciones, actividades de clase,
//     metas, contextos, apoyos...): spellcheck ON + lang="es".
//   - Los <input type="text"> quedan spellcheck OFF salvo que declaren
//     data-spell="on": ahí viven nombres propios (apellidos mapuche como
//     Millahual/Caullán), RUT, códigos y fechas que el diccionario marcaría
//     como "errores" sin serlo.
// Cubre también los campos creados dinámicamente (fichas, módulos del PACI,
// formularios de docs.html) mediante un MutationObserver.
// Costo cero: no usa librerías ni servicios externos; el texto nunca sale del
// navegador. Requiere tener activado el corrector del navegador en español
// (en Chrome/Edge viene activo si el sistema está en español).
(function () {
  'use strict';

  function aplicar(el) {
    if (el.tagName === 'TEXTAREA') {
      el.spellcheck = true;
      if (!el.lang) el.lang = 'es';
    } else if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search')) {
      el.spellcheck = el.dataset.spell === 'on';
    }
  }

  function aplicarEn(raiz) {
    if (raiz.querySelectorAll) {
      raiz.querySelectorAll('textarea, input[type="text"], input[type="search"]').forEach(aplicar);
    }
    if (raiz.tagName) aplicar(raiz);
  }

  function iniciar() {
    aplicarEn(document.body);
    // Campos que se agregan después (fichas expandidas, clases nuevas, modales...)
    new MutationObserver(function (mutaciones) {
      mutaciones.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1) aplicarEn(n);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
