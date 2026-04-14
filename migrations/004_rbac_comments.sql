-- Tabla de comentarios por documento (para profesor_asignatura y utp)
CREATE TABLE IF NOT EXISTS document_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_doc ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON document_comments(user_email);

-- Campos de aprobacion en documentos (para rol utp)
ALTER TABLE documents ADD COLUMN approval_status TEXT DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN approved_by TEXT DEFAULT '';
ALTER TABLE documents ADD COLUMN approved_at TEXT DEFAULT '';
