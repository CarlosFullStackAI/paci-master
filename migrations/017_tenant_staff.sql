-- Profesionales del establecimiento por cargo (equipo PIE + docentes).
-- Antes vivian hardcodeados en app.html (profesionalesPorCargo de renderEquipoForm):
-- solo servian para lcm-pulebu y rompian el multi-establecimiento. Ahora cada
-- tenant define su lista aqui, editable por el admin en admin.html, y
-- /api/tenant-config la entrega al frontend. La lista hardcodeada queda solo
-- como fallback de red para lcm-pulebu (igual que el calendario escolar).
-- Estructura: { "Cargo": ["Nombre 1", "Nombre 2", ...], ... }
-- (cargo con lista vacia = se ofrece el cargo pero el nombre se escribe a mano)
ALTER TABLE tenants ADD COLUMN staff_json TEXT DEFAULT '';

-- Semilla: profesionales 2026 de la Escuela Luis Cruz Martinez (Pulebu),
-- copiados de las constantes que estaban en el codigo.
UPDATE tenants SET staff_json = '{
  "Profesor/a de Educación Diferencial": ["Carlos Molina Salgado", "Victoria Irazoqui Alarcón", "Trinidad Aguilera Pincheira", "Yoselyn Melita Pascal"],
  "Psicólogo": ["Marcos Paine Paillao"],
  "Fonoaudiólogo/a": ["Fernanda Duhart Fernandez"],
  "Profesor/a Jefe": ["Jasmín Pérez Villamán", "Itsha Díaz Muñoz", "Eduardo Valenzuela Aguayo", "Margot Torres Opazo", "Moises Villarroel Cortés", "José Luis Andrade Fuenzalida", "Ruben Ramírez Molina", "Gabriel Villarroel Cortés", "Sebastián Salamó Valenzuela"],
  "Coordinador/a PIE": ["Gladys Matamala Salas"],
  "Profesor/a de Artes Visuales": ["Ruben Ramírez Molina (1° a 8°)"],
  "Profesor/a de Música": ["José Luis Andrade Fuenzalida (1° a 8°)"],
  "Profesor/a de Tecnología": ["José Luis Andrade Fuenzalida (1° a 8°)"],
  "Profesor/a de Religión": ["José Luis Andrade Fuenzalida (1° a 8°)"],
  "Profesor/a de Educación Física y Salud": ["Eduardo Valenzuela Aguayo (1° a 8°)"],
  "Profesor/a de Historia y Geografía": ["Sebastián Salamó Valenzuela (1° a 8°)"],
  "Profesor/a de Lengua Indígena": ["Alicia Yevilao (1° a 8°)"],
  "Profesor/a de Inglés": ["Itsha Díaz Muñoz (1° a 8°)"],
  "Profesor/a de Lenguaje y Comunicación": ["Margot Torres Opazo (1° a 4°)", "Katherine Mendoza Campos (5° a 8°)", "Jasmín Pérez Villamán (1° a 4°)"],
  "Profesor/a de Matemáticas": ["Margot Torres Opazo (1° a 4°)", "Gabriel Villarroel Cortés (5° a 8°)"],
  "Profesor/a de Ciencias Naturales": ["Margot Torres Opazo (1° a 4°)", "Ruben Ramírez Molina (5°)", "Sebastián Salamó Valenzuela (6°)", "Katherine Mendoza (7°)", "Gabriel Villarroel Cortés (8°)"],
  "Apoderado/a o Familia": [],
  "Jefe/a UTP / Coordinador/a PIE": []
}' WHERE slug = 'lcm-pulebu';
