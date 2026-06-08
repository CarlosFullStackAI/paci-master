-- Multi-establecimiento (Fase 4b): vincular documentos a su establecimiento.
-- Aditiva. Backfill: cada documento hereda el tenant_id de su estudiante.
-- Ejecutar una sola vez.
ALTER TABLE documents ADD COLUMN tenant_id INTEGER;
UPDATE documents
  SET tenant_id = (SELECT s.tenant_id FROM students s WHERE s.id = documents.student_id)
  WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
