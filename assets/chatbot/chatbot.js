// Chatbot Paci - cliente
// FAB flotante + panel con historial stateful en sessionStorage.
// Llama a /api/ai/chatbot que valida auth y rate limit.
(function () {
  'use strict';

  const STORAGE_KEY = 'paciChatHistory';
  const MAX_HISTORY = 6; // matchea limite backend
  const SUGGESTIONS = [
    'Como creo un PACI?',
    'Que dice el Decreto 83?',
    'Como adapto un OA?',
    'Donde veo los registros?'
  ];

  // Escape HTML para defender contra XSS en respuestas del modelo
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(-MAX_HISTORY);
    } catch (e) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
    } catch (e) { /* ignore quota */ }
  }

  function buildPanelHtml() {
    return `
      <button class="paci-chat-fab" id="paciChatFab" aria-label="Abrir asistente Paci" title="Asistente Paci">
        <i class="fa-solid fa-message"></i>
        <span class="paci-chat-fab-badge" aria-hidden="true"></span>
      </button>
      <div class="paci-chat-panel" id="paciChatPanel" role="dialog" aria-label="Asistente Paci" aria-hidden="true">
        <div class="paci-chat-header">
          <div class="paci-chat-avatar"><i class="fa-solid fa-robot"></i></div>
          <div>
            <div class="paci-chat-title">Paci</div>
            <div class="paci-chat-subtitle">Asistente PIE</div>
          </div>
          <button class="paci-chat-close" id="paciChatClose" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="paci-chat-messages" id="paciChatMessages" aria-live="polite"></div>
        <div class="paci-chat-suggestions" id="paciChatSuggestions"></div>
        <div class="paci-chat-input-wrap">
          <textarea class="paci-chat-input" id="paciChatInput" rows="1" placeholder="Pregunta a Paci..." maxlength="1500" aria-label="Escribir mensaje"></textarea>
          <button class="paci-chat-send" id="paciChatSend" aria-label="Enviar"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
        <div class="paci-chat-footer">Paci puede equivocarse. Verifica normativa y OAs.</div>
      </div>
    `;
  }

  function renderHistory(history) {
    const cont = document.getElementById('paciChatMessages');
    if (!cont) return;
    if (!history.length) {
      cont.innerHTML = `<div class="paci-chat-msg assistant">Hola! Soy Paci, tu asistente PIE. Puedo ayudarte a usar la plataforma o resolver dudas pedagogicas sobre Decreto 83/2015 y NEE. Que quieres saber?</div>`;
      return;
    }
    cont.innerHTML = history.map(m => `
      <div class="paci-chat-msg ${m.role}">${escapeHtml(m.content)}</div>
    `).join('');
    cont.scrollTop = cont.scrollHeight;
  }

  function renderSuggestions(visible) {
    const cont = document.getElementById('paciChatSuggestions');
    if (!cont) return;
    if (!visible) { cont.innerHTML = ''; return; }
    cont.innerHTML = SUGGESTIONS.map(s =>
      `<button class="paci-chat-suggestion" data-suggestion="${escapeHtml(s)}">${escapeHtml(s)}</button>`
    ).join('');
    cont.querySelectorAll('.paci-chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('paciChatInput');
        if (!input) return;
        input.value = btn.dataset.suggestion || '';
        input.focus();
      });
    });
  }

  function showTyping() {
    const cont = document.getElementById('paciChatMessages');
    if (!cont) return;
    const el = document.createElement('div');
    el.className = 'paci-chat-typing';
    el.id = 'paciChatTyping';
    el.innerHTML = '<span></span><span></span><span></span>';
    cont.appendChild(el);
    cont.scrollTop = cont.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('paciChatTyping');
    if (el) el.remove();
  }

  async function sendMessage(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    if (trimmed.length > 1500) {
      window.alert('El mensaje es demasiado largo (max 1500 caracteres).');
      return;
    }

    const history = loadHistory();
    history.push({ role: 'user', content: trimmed });
    saveHistory(history);
    renderHistory(history);
    renderSuggestions(false);

    const input = document.getElementById('paciChatInput');
    const sendBtn = document.getElementById('paciChatSend');
    if (input) { input.value = ''; input.style.height = 'auto'; }
    if (sendBtn) sendBtn.disabled = true;

    showTyping();

    try {
      const res = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ messages: history })
      });

      hideTyping();
      const data = await res.json().catch(() => ({ ok: false, error: 'Respuesta invalida.' }));

      if (!res.ok || !data.ok) {
        const errMsg = data && data.error ? data.error : 'No pude responder ahora. Intenta de nuevo.';
        const errHistory = loadHistory();
        // No persistimos el error en history (solo el mensaje del usuario ya esta)
        const cont = document.getElementById('paciChatMessages');
        if (cont) {
          const el = document.createElement('div');
          el.className = 'paci-chat-msg assistant error';
          el.textContent = errMsg;
          cont.appendChild(el);
          cont.scrollTop = cont.scrollHeight;
        }
        if (sendBtn) sendBtn.disabled = false;
        return;
      }

      const reply = String(data.reply || '').trim();
      if (reply) {
        const finalHistory = loadHistory();
        finalHistory.push({ role: 'assistant', content: reply });
        saveHistory(finalHistory);
        renderHistory(finalHistory);
      }
    } catch (e) {
      hideTyping();
      const cont = document.getElementById('paciChatMessages');
      if (cont) {
        const el = document.createElement('div');
        el.className = 'paci-chat-msg assistant error';
        el.textContent = 'Error de conexion. Verifica tu internet.';
        cont.appendChild(el);
      }
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();
    }
  }

  function openPanel() {
    const panel = document.getElementById('paciChatPanel');
    if (!panel) return;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    const history = loadHistory();
    renderHistory(history);
    renderSuggestions(history.length === 0);
    setTimeout(() => {
      const input = document.getElementById('paciChatInput');
      if (input) input.focus();
    }, 200);
  }

  function closePanel() {
    const panel = document.getElementById('paciChatPanel');
    if (!panel) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function attach() {
    if (document.getElementById('paciChatFab')) return; // ya montado

    const wrap = document.createElement('div');
    wrap.innerHTML = buildPanelHtml();
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

    document.getElementById('paciChatFab').addEventListener('click', () => {
      const panel = document.getElementById('paciChatPanel');
      if (panel.classList.contains('open')) closePanel(); else openPanel();
    });
    document.getElementById('paciChatClose').addEventListener('click', closePanel);

    const input = document.getElementById('paciChatInput');
    const send = document.getElementById('paciChatSend');

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });

    send.addEventListener('click', () => sendMessage(input.value));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const panel = document.getElementById('paciChatPanel');
        if (panel && panel.classList.contains('open')) closePanel();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }

  window.PaciChat = {
    open: openPanel,
    close: closePanel,
    clear: () => { sessionStorage.removeItem(STORAGE_KEY); renderHistory([]); renderSuggestions(true); }
  };
})();
