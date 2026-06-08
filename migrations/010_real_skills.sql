-- Nivel real de habilidades del estudiante (descripcion funcional, no el curso).
-- Lo usa la IA de planificacion para generar clases realistas segun lo que el
-- estudiante REALMENTE puede hacer, no segun su nivel curricular nominal.
-- Nota: SQLite no soporta "ADD COLUMN IF NOT EXISTS"; ejecutar esta migracion
-- una sola vez (si la columna ya existe, dara error de columna duplicada y se ignora).
ALTER TABLE students ADD COLUMN real_skills TEXT DEFAULT '';
