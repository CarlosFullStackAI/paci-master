-- Estudiantes por usuario
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  diagnosis TEXT,
  diagnosis_id TEXT,
  real_level TEXT,
  work_level TEXT,
  school TEXT DEFAULT 'Escuela Luis Cruz Martinez',
  birth_date TEXT,
  age INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Documentos PACI
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  trimester TEXT NOT NULL,
  subject TEXT,
  subject_key TEXT,
  work_level TEXT,
  date_start TEXT,
  date_end TEXT,
  num_classes INTEGER,
  document_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- OAs trabajados por documento (para tracking y sugerencias)
CREATE TABLE IF NOT EXISTS document_oas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  level TEXT NOT NULL,
  unit_name TEXT,
  oa_code TEXT NOT NULL,
  oa_text TEXT NOT NULL,
  trimester TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_email);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_email);
CREATE INDEX IF NOT EXISTS idx_documents_student ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_doc_oas_student ON document_oas(student_id, subject_key, level);
CREATE INDEX IF NOT EXISTS idx_doc_oas_document ON document_oas(document_id);
