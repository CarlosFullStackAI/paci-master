-- Codigo de union por establecimiento: el usuario debe ingresarlo al registrarse
-- para unirse a ese colegio (cierra el registro abierto). Aditiva. Ejecutar una vez.
ALTER TABLE tenants ADD COLUMN join_code TEXT DEFAULT '';
-- Codigo inicial para el colegio existente. RECOMENDADO: regenerarlo desde el panel admin.
UPDATE tenants SET join_code = 'LCM-PIE-7K3M' WHERE slug = 'lcm-pulebu' AND (join_code IS NULL OR join_code = '');
