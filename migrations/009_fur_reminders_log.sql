-- Log de recordatorios de FUR enviados por correo, para evitar duplicados
-- dentro de una ventana (no spamear al educador con el mismo recordatorio).
CREATE TABLE IF NOT EXISTS fur_reminders_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  due_date TEXT,
  status TEXT,
  sent_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fur_reminders_user_student ON fur_reminders_log(user_email, student_id, sent_at);
