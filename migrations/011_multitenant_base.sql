-- Multi-establecimiento (multi-tenant) — estructura base (Fase 2).
-- Aditiva y segura: crea tablas nuevas y una columna nueva; el codigo actual la ignora
-- hasta que las fases siguientes la usen. Ejecutar una sola vez.

-- 1) Establecimientos (colegios). slug = subdominio (ej. lcm-pulebu.dominio.cl).
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  nombre TEXT NOT NULL,
  nombre_corto TEXT DEFAULT '',
  rbd TEXT DEFAULT '',
  comuna TEXT DEFAULT '',
  localidad TEXT DEFAULT '',
  region TEXT DEFAULT '',
  branding_json TEXT DEFAULT '',
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- 2) Contexto de IA: UNA fila por establecimiento (compartida entre sus docentes).
CREATE TABLE IF NOT EXISTS ai_contexts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  duracion TEXT DEFAULT '',
  estrategias_eval TEXT DEFAULT '',
  dua_checks TEXT DEFAULT '',
  contexto TEXT DEFAULT '',
  conocimientos TEXT DEFAULT '',
  intereses TEXT DEFAULT '',
  recursos TEXT DEFAULT '',
  dua_detalle TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_contexts_tenant ON ai_contexts(tenant_id);

-- 3) Vincular cada estudiante a su establecimiento.
ALTER TABLE students ADD COLUMN tenant_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);

-- 4) Sembrar el establecimiento inicial (desde data/tenants/lcm-pulebu/config.json).
INSERT INTO tenants (slug, nombre, nombre_corto, rbd, comuna, localidad, region, branding_json)
VALUES ('lcm-pulebu', 'Escuela Luis Cruz Martínez', 'LCM Pulebu', '', '', 'Pulebu', 'Biobio',
  '{"color_primario":"#091845","color_secundario":"#1240c4","logo_principal":"logos/escuela.png","logo_pie":"logos/pie.png"}');

-- 5) Backfill: los estudiantes existentes pertenecen al establecimiento inicial.
UPDATE students SET tenant_id = (SELECT id FROM tenants WHERE slug = 'lcm-pulebu') WHERE tenant_id IS NULL;
