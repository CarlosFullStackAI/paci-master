/**
 * PIE MASTER - Módulo de Persistencia y Autosave
 */

// Recolecta y normaliza los datos del formulario
window.recolectarDatosPACI = function() {
    const nombre = document.getElementById('in-nombre') ? document.getElementById('in-nombre').value : '';
    if (!nombre.trim()) { alert('Ingresa el nombre del estudiante antes de guardar.'); return null; }

    const student = {
        name: nombre.trim(),
        school: document.getElementById('in-escuela') ? document.getElementById('in-escuela').value : '',
        birthDate: document.getElementById('in-fnac') ? document.getElementById('in-fnac').value : '',
        age: document.getElementById('in-edad') ? parseInt(document.getElementById('in-edad').value) || 0 : 0,
        diagnosis: document.getElementById('in-diag') ? document.getElementById('in-diag').options[document.getElementById('in-diag').selectedIndex]?.text || '' : '',
        diagnosisId: document.getElementById('in-diag') ? document.getElementById('in-diag').value : '',
        realLevel: document.getElementById('in-nivel-real') ? document.getElementById('in-nivel-real').options[document.getElementById('in-nivel-real').selectedIndex]?.text || '' : '',
        workLevel: document.getElementById('in-nivel-trabajo') ? document.getElementById('in-nivel-trabajo').options[document.getElementById('in-nivel-trabajo').selectedIndex]?.text || '' : ''
    };

    const trimester = document.getElementById('in-duracion') ? document.getElementById('in-duracion').options[document.getElementById('in-duracion').selectedIndex]?.text || '' : '';

    // Recoger equipo del estado global
    const team = window.state.equipo.map(m => ({ rol: m.rol, nom: m.nom }));

    // Recoger modulos
    if (!window.state.modulos.length) { alert('Agrega al menos un modulo de planificacion antes de guardar.'); return null; }

    const modules = window.state.modulos.map(m => {
        // Buscar subject_key
        let asigKey = '';
        const asigSelect = document.getElementById('in-asig');
        if (asigSelect) {
            for (const opt of asigSelect.options) {
                // MINEDUC_DB debe estar cargado globalmente
                if (window.MINEDUC_DB && window.MINEDUC_DB.curriculum[opt.value]) {
                    if (m.asig && opt.textContent.trim() === m.asig) {
                        asigKey = opt.value;
                        break;
                    }
                }
            }
        }
        return { ...m, asigKey: asigKey };
    });

    return { student, trimester, team, modules };
};

// Función principal de guardado manual
window.guardarPACI = async function() {
    if (!window.PACI_CAN_EDIT) {
        alert('No tienes permisos para guardar.');
        return;
    }

    const btn = document.getElementById('btn-guardar');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

    try {
        const token = localStorage.getItem('paci_token');
        const datos = window.recolectarDatosPACI();
        if (!datos) return;

        const res = await fetch('/api/documents/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...datos,
                _token: token,
                documentId: window.autosave.lastDocumentId || undefined
            })
        });

        const data = await res.json();

        if (data.ok) {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Guardado!';
            btn.style.background = '#059669';
            window.autosave.dirty = false;
            window.autosave.lastDocumentId = data.documentId || null;
            try { localStorage.removeItem(window.autosave.getStorageKey()); } catch(e) {}
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 2000);
        } else {
            alert('Error al guardar: ' + (data.error || 'Intenta de nuevo.'));
        }
    } catch (e) {
        alert('Error de conexion al guardar.');
    } finally {
        btn.disabled = false;
        if (btn.innerHTML.includes('Guardando')) btn.innerHTML = originalHTML;
    }
};

// Objeto de Autosave
window.autosave = {
    dirty: false,
    timer: null,
    syncInterval: null,
    lastDocumentId: null,
    DEBOUNCE_MS: 2000,
    SYNC_INTERVAL_MS: 60000,
    STORAGE_PREFIX: 'paci_autosave_',

    getStorageKey() {
        const name = document.getElementById('in-nombre')?.value || 'nuevo';
        const trim = document.getElementById('in-duracion')?.selectedOptions[0]?.text || '';
        return this.STORAGE_PREFIX + name.replace(/\s+/g, '_') + '_' + trim.replace(/\s+/g, '_');
    },

    collectFormData() {
        const studentName = document.getElementById('in-nombre')?.value || '';
        if (!studentName) return null;

        return {
            student: {
                name: studentName,
                school: document.getElementById('in-escuela')?.value || '',
                birthDate: document.getElementById('in-fnac')?.value || '',
                age: parseInt(document.getElementById('in-edad')?.value) || 0,
                diagnosis: document.getElementById('in-diag')?.selectedOptions[0]?.text || '',
                diagnosisId: document.getElementById('in-diag')?.value || '',
                realLevel: document.getElementById('in-nivel-real')?.selectedOptions[0]?.text || '',
                workLevel: document.getElementById('in-nivel-trabajo')?.selectedOptions[0]?.text || ''
            },
            team: window.state.equipo.map(m => ({ rol: m.rol, nom: m.nom })),
            modules: window.state.modulos,
            trimester: document.getElementById('in-duracion')?.selectedOptions[0]?.text || '',
            documentId: this.lastDocumentId
        };
    },

    saveToLocal() {
        if (!window.PACI_CAN_EDIT) return;
        const data = this.collectFormData();
        if (!data) return;
        try {
            localStorage.setItem(this.getStorageKey(), JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {}
    },

    async syncToBackend() {
        if (!window.PACI_CAN_EDIT || !this.dirty) return;
        const data = this.collectFormData();
        if (!data || !data.student.name) return;

        try {
            const token = localStorage.getItem('paci_token');
            const res = await fetch('/api/documents/autosave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, _token: token })
            });
            const result = await res.json();
            if (result.ok) {
                this.dirty = false;
                this.lastDocumentId = result.documentId;
                if (window.showAutosaveIndicator) window.showIndicator('saved');
            }
        } catch (e) {}
    },

    markDirty() {
        if (!window.PACI_CAN_EDIT) return;
        this.dirty = true;
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.saveToLocal(), this.DEBOUNCE_MS);
    },

    init() {
        this.syncInterval = setInterval(() => this.syncToBackend(), this.SYNC_INTERVAL_MS);
    }
};
