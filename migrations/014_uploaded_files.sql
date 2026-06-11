-- Documentos subidos como archivo (PDF/Word/imagen) al checklist del estudiante.
-- Aditiva. file_key apunta al objeto en KV (binding PACI_FILES); file_name y
-- file_mime permiten servirlo con el nombre y tipo correctos.
ALTER TABLE documents ADD COLUMN file_key TEXT;
ALTER TABLE documents ADD COLUMN file_name TEXT;
ALTER TABLE documents ADD COLUMN file_mime TEXT;
