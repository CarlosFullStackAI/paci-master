-- Nuevos campos del perfil del estudiante
ALTER TABLE students ADD COLUMN rut TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN guardian TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN nee_type TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN last_evaluation_date TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN next_evaluation_date TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN evaluation_periodicity TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN diagnosis_date TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN observations TEXT DEFAULT '';
