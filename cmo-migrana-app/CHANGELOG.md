# Changelog

## 1.1.0 - 2026-07-21

- Añadida sección opcional y colapsada por defecto "Extracción asistida por IA (opcional)", antes del cuestionario manual: flujo copia-pega de historia clínica → prompt generado → JSON de respuesta pegado → autorrelleno validado del cuestionario, sin llamadas a servicios externos desde la herramienta.
- Nuevo módulo `src/ai-extraction.mjs` que deriva el esquema de extracción y el prompt directamente del catálogo real de variables (`core.mjs`), y valida tipos/rangos del JSON de respuesta sin bloquear el uso manual ante errores.
- Marcado visual («IA — revisar») de los campos autorrellenados por IA hasta su revisión o edición manual.
- No se ha modificado la lógica del modelo CMO, el cuestionario manual, la exportación/impresión ni la atribución de autoría.

## 1.0.0 - 2026-07-21

- Aplicación inicial CMO-Migraña independiente.
- Motor de cálculo determinista, catálogo centralizado, guardado local, exportación e informe imprimible.
