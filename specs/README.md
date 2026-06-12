# specs/ — Especificaciones de features grandes

Convencion inspirada en github/spec-kit (solo el habito, sin instalar nada).
Regla completa: `~/.claude/rules/spec-features-grandes.md`.

## Cuando se escribe una spec
- SOLO para features grandes o refactors importantes (varios archivos, datos,
  o decisiones de diseno que Carlos deba aprobar).
- Bugfixes y cambios chicos NO llevan spec: se hacen directo.

## Flujo
1. Copiar `_plantilla.md` a `<nombre-feature>.md` (kebab-case).
2. Completar el QUE (entendible por una educadora, sin tecnicismos).
3. Marcar toda ambiguedad como `[FALTA ACLARAR: ...]` y resolverla con Carlos
   ANTES de escribir codigo.
4. Carlos aprueba la spec -> recien ahi se planifica el COMO y se codifica.
5. Si el alcance cambia a mitad de camino, la spec se ACTUALIZA (una spec
   desactualizada miente igual que documentacion vieja).
6. Al terminar, marcar el estado como Implementada con la fecha y el commit.

## Estados
- `Borrador` -> `Aprobada` -> `Implementada (fecha, commit)` -> `Obsoleta`
