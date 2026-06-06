-- Tipos de plan (PACI vs PAI) y vinculo anual <-> trimestral
--
-- plan_type:       'paci' adapta/modifica el curriculum (Decreto 83)
--                  'pai'  organiza los apoyos del PIE (profesionales, horas, etc.)
-- plan_scope:      'anual'      plan "padre" que cubre todo el ano
--                  'trimestral' plan que deriva de un anual, o documento suelto
-- parent_id:       id del documento anual padre (NULL si es anual o documento suelto)
-- trimester_index: 1, 2 o 3 para los trimestrales derivados de un anual (NULL en otros casos)

ALTER TABLE documents ADD COLUMN plan_type TEXT DEFAULT 'paci';
ALTER TABLE documents ADD COLUMN plan_scope TEXT DEFAULT 'trimestral';
ALTER TABLE documents ADD COLUMN parent_id INTEGER;
ALTER TABLE documents ADD COLUMN trimester_index INTEGER;

-- Buscar rapido todos los hijos de un plan anual.
CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_id);

-- Backfill seguro: los documentos previos son todos PACI (lo cubre el DEFAULT).
-- Solo necesitamos marcar como 'anual' los que ya tenian trimestre = 'Anual';
-- el resto queda 'trimestral' por el DEFAULT de la columna.
UPDATE documents SET plan_scope = 'anual' WHERE trimester = 'Anual';
