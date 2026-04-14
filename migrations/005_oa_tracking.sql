-- Seguimiento semestral de progreso por OA
ALTER TABLE document_oas ADD COLUMN progress_status TEXT DEFAULT 'no_evaluado';
-- Valores: 'logrado', 'en_desarrollo', 'no_logrado', 'no_evaluado'
ALTER TABLE document_oas ADD COLUMN progress_observations TEXT DEFAULT '';
ALTER TABLE document_oas ADD COLUMN evaluated_at TEXT DEFAULT '';
ALTER TABLE document_oas ADD COLUMN evaluated_by TEXT DEFAULT '';
