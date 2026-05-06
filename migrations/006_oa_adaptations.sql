-- Adecuacion curricular de OAs: separar texto original (MINEDUC) del texto adecuado (educador)
-- oa_text_original: texto exacto del catalogo MINEDUC (inmutable, trazabilidad)
-- oa_text_adapted: texto adecuado por el educador para el estudiante
-- oa_text (legacy): se mantiene espejando oa_text_adapted para compatibilidad con lecturas existentes

ALTER TABLE document_oas ADD COLUMN oa_text_original TEXT DEFAULT '';
ALTER TABLE document_oas ADD COLUMN oa_text_adapted TEXT DEFAULT '';

-- Backfill: documentos previos no tienen distincion entre original y adecuado,
-- copiamos el texto actual a ambas columnas (si no se edito, original === adecuado)
UPDATE document_oas
   SET oa_text_original = oa_text,
       oa_text_adapted  = oa_text
 WHERE oa_text_original = '';
