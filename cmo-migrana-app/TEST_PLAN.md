# Plan de pruebas

La suite de pruebas (`node --test`) cubre máximos, umbrales, prioridad automática, menores de edad, datos ausentes, override, intervenciones acumulativas, exclusión de conceptos prohibidos, importación/exportación e informe imprimible. Quedan pendientes pruebas E2E de navegador real y auditoría documental con el PDF fuente.

## Extracción asistida por IA

`test/ai-extraction.test.mjs` cubre: el catálogo de extracción coincide exactamente con `VARIABLES`, el prompt generado incluye todos los campos/opciones y las instrucciones obligatorias (JSON exclusivo, `null`, `campos_no_encontrados`, `citas_textuales`), validación de JSON completo, parcial (con `null`), mal formado y con valores/tipos fuera de esquema.

Además se ha verificado manualmente con un navegador real (Playwright/Chromium) el flujo completo: HC de ejemplo → prompt generado con todos los campos → copia al portapapeles → JSON válido autorrellena y marca visualmente los campos → JSON mal formado muestra error sin romper la herramienta → JSON parcial con `null` solo rellena lo disponible → edición manual retira la marca IA → "Borrar datos de esta extracción" limpia todo → cuestionario manual sin usar IA sigue calculando la prioridad igual que antes → sin restos en `localStorage`/`sessionStorage`/cookies tras la sesión → usable en viewport 375×667 (botones e input dentro de la sección permanecen dentro del ancho de pantalla).
