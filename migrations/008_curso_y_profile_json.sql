-- Agrega `curso` (seccion: ej "3°A") y `profile_json` (datos adicionales
-- centralizados del estudiante: apoderado completo, salud, contexto familiar)
-- para que TODOS los documentos del mismo estudiante puedan autocompletarse
-- con datos coherentes desde una sola fuente de verdad.

ALTER TABLE students ADD COLUMN curso TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN profile_json TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_students_curso ON students(user_email, curso);
