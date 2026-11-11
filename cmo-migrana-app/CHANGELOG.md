# Changelog

## 2.2.0 — sin publicar (rama `claude/zen-pasteur-u8tn7z`)

Informe único con PDF, estado de las actuaciones, plan de seguimiento, necesidades, resultado provisional con cota superior e importación validada. **Sin cambios en el modelo clínico**: `src/core.mjs` y `src/local-extractor.mjs` son idénticos byte a byte a la 2.1.0 (huellas SHA-256 en `test/fixtures/clinical.sha256.json`). La fecha y el estado de publicación se fijan en el commit de publicación.

### Novedades
- **Informe único** (`cmo-report/1`): texto para historia clínica, impresión, PDF real y `.txt` salen de la misma estructura. Botones nuevos «Copiar informe para historia clínica» y «Descargar PDF». El informe incluye la prioridad calculada por el modelo, la modificación profesional (antes ausente del TXT), el estado provisional y las advertencias.
- **Necesidades, actuaciones y seguimiento**: necesidades por dimensión (confirmadas y potenciales), **estado de cada actuación del modelo** (realizada, planificada, no procede) y plan (próxima valoración, observaciones). Se guardan con el caso.
- **Resultado provisional** con las variables pendientes y la cota superior de puntuación y prioridad posible (calculada con las opciones de cada variable); la prioridad se rotula «provisional» y una variable pendiente nunca se interpreta como «No».
- **Menor de 18 años**: ya no se muestra una «Prioridad final» de adultos (pantalla, título de la pestaña, informe): «no aplicable (modelo pediátrico)».
- **Modificación manual**: rebajar una prioridad automática exige una confirmación previa (antes se guardaba `reinforcedWarningAccepted: true` sin mostrar aviso) y una justificación de al menos 12 caracteres; el aviso figura en pantalla e informe. La regla no se ha endurecido más (decisión pendiente del autor).
- **Exportación**: JSON con esquema y versión (`cmo-export/1` + `cmo-mig-case/1`) y CSV protegido frente a fórmulas (antes con `\"` y sin neutralizar). Un solo constructor de informe en lugar de tres.
- **Importación** desde fichero (ya no por `prompt()`), validada: solo variables y opciones del modelo, el resultado se recalcula siempre, y el formato anterior sigue siendo importable. Antes se aceptaba cualquier contenido (p. ej. «Prioridad final: 9») y un JSON inválido lanzaba una excepción.
- Confirmaciones accesibles y avisos no bloqueantes en lugar de `alert()`; aviso al salir con cambios sin guardar.

### Defectos corregidos
- Un caso borrado reaparecía al teclear y cada carga creaba un caso vacío: ahora «Borrar caso» empieza un caso nuevo y solo se guardan casos con datos.
- XSS por la justificación de la modificación y el identificador de caso (ya en la rama).
- Tabla de contribuciones desplazable en móvil (desbordaba a 375 px).

### Pruebas
- `npm test`: 83 (72 previas + 11 del adaptador: huellas, fronteras 14/15 y 18/19, paridad en 300 casos, pendientes y cota, menor de 18, modificación, actuaciones, informe, importación hostil y formato anterior, CSV). `npm run test:e2e`: 6 recorridos en Chromium con axe WCAG A/AA opcional (`AXE_PATH`).

### Pendiente de decisión del autor
- Incoherencias heredadas: `THRESHOLDS.totalMax` = 39 pero el máximo alcanzable es 38 (`dimensionMaxima`); `paciente_naive` obligatoria y sin puntuación; la fuente figura como «PDF no disponible en repositorio; pendiente de verificación literal».
- Extractor local: negación pospuesta no tratada (p. ej. «Embarazada no»); no se ha modificado.
- Sigue siendo una página única (no un asistente de 7 etapas).

## Sin publicar (rama `claude/zen-pasteur-u8tn7z`) — corrección de seguridad

- **XSS corregido**: la justificación de la modificación profesional (tecleada o importada) y el identificador de caso se insertaban como HTML sin escapar (`src/main.js`). Sin cambios en el modelo clínico, el motor ni las reglas del analizador. Prueba de regresión: `test/xss-escape.test.mjs`.
- Origen: auditoría funcional del ecosistema (hub, `docs/ECOSISTEMA_CMO_AUDIT.md`). La versión se fija en el commit de publicación.

## 2.1.0 - 2026-10-30

Publicación de la identidad CMO Design System (decisión del autor: versión menor por el cambio de interfaz). `package.json` seguía en 1.0.0 aunque este CHANGELOG registraba 1.1.0, 1.2.0 y 2.0.0; se alinea con la última entrada (2.0.0 → 2.1.0) para no reutilizar números ya asignados. CMO Design System actualizado a 0.2.0. `cmo-app-meta`: `status: "released"`, `releaseDate: "2026-10-30"`. `MODEL_VERSION` (CMO-Migraña v1.0) sin cambios.

### Identidad CMO Design System (antes «sin publicar»)

Cambio exclusivamente visual. Sin cambios en `src/core.mjs`, `src/local-extractor.mjs` ni `src/main.js`; `MODEL_VERSION` sin cambios.
- Copia fijada del CMO Design System 0.1.0 en `src/cmo-ds/` (manifiesto SHA-256).
- Nuevo `src/cmo-visual.css` (tema «Estratos» sobre tokens) cargado tras `src/style.css`, que no se modifica. Colores de prioridad (`.p1/.p2/.p3`) y del preanálisis (`.pre-*`) sin cambios.
- Accesibilidad: foco de #ffbf47 (1,6:1) a #1f3aa8 (9,4:1); borde de campos de #9aa8bb (2,4:1) a #7b8495 (≥3:1). Acciones destructivas (#del, #clear) diferenciadas visualmente.
- Firma `<cmo-author-signature>` (desarrollo digital, algoritmo CMO-Migraña v1.0, versión 1.0.0) fuera de `#app`; favicon del ecosistema.
- Pruebas: `test/cmo-ds.test.mjs`. Raíz de GitHub Pages (`index.html`, `404.html`) regenerada con `npm run build:pages`.

## 2.0.0 - 2026-07-21

- **Eliminado por completo** el uso de cualquier servicio de inteligencia artificial generativa
  externa (Azure OpenAI, OpenAI, Anthropic), gratuito o de pago: se han borrado los módulos
  `src/ai-extraction.mjs`, `src/ai-providers.mjs` y `src/key-storage.mjs`, junto con toda la
  configuración de proveedor, endpoint, deployment, clave API, almacenamiento cifrado de
  credenciales, modal de consentimiento de envío a proveedor y los textos asociados.
- Renombrada y reconstruida la sección como **"Preestratificación automática desde texto"**:
  un analizador **local, determinista y auditable** (`src/local-extractor.mjs`, motor de
  reglas léxicas con detección de negación, duda y antecedente familiar), sin IA generativa,
  sin llamadas a red y funcional sin conexión.
- Nueva interfaz de revisión: tabla con variable, propuesta, estado de certeza (detectado /
  ausente explícitamente / dudoso o contradictorio / no mencionado), fragmento justificativo,
  regla aplicada y puntuación provisional; confirmación, corrección o rechazo individual por
  variable (sin "aceptar todo"). Ninguna propuesta se traslada al cuestionario sin confirmación
  explícita; los campos no mencionados nunca se interpretan como respuesta negativa ni como cero.
- Los campos confirmados quedan marcados («Preestratificación — revisar») igual que antes, con
  el mismo mecanismo de marcado visual y la misma limpieza automática al cambiar de caso.
- Nuevo desplegable "Limitaciones conocidas del analizador" visible en la propia interfaz.
- No se ha modificado la lógica del modelo CMO, el cuestionario manual, la exportación/impresión
  ni la atribución de autoría.

## 1.2.0 - 2026-07-21

- Reemplazado el flujo bidireccional de extracción por IA por un flujo de un solo paso: pegar HC → botón "Extraer y prerrellenar cuestionario" → llamada directa navegador→proveedor de IA (BYOK, sin backend) → cuestionario prerrellenado y marcado.
- Nuevo panel de configuración de proveedor (⚙️): Azure OpenAI (por defecto), OpenAI o Anthropic; clave API con mostrar/ocultar; endpoint (Azure); modelo/deployment; "solo esta sesión" (por defecto) o "recordar en este navegador" con cifrado AES-GCM de la clave (SubtleCrypto + PBKDF2 sobre una frase de paso), nunca en texto plano.
- Nuevos módulos `src/ai-providers.mjs` (llamada HTTP directa a Azure OpenAI/OpenAI/Anthropic, clasificación de errores de red/401-403/429/5xx/timeout) y `src/key-storage.mjs` (cifrado de la clave y registro de consentimiento).
- Modal de consentimiento explícito antes de la primera llamada (registrado en `localStorage`, revocable); aviso permanente y no descartable de envío al proveedor configurado.
- Reintento automático único ante JSON mal formado; si falla de nuevo, error claro y oferta permanente de "modo manual (fallback)".
- El flujo copia-pega original se conserva íntegro como modo manual (fallback), oculto por defecto tras un enlace, reutilizando sin cambios el esquema/prompt y el validador de `ai-extraction.mjs`.
- No se ha modificado la lógica del modelo CMO, el cuestionario manual, la exportación/impresión ni la atribución de autoría.

## 1.1.0 - 2026-07-21

- Añadida sección opcional y colapsada por defecto "Extracción asistida por IA (opcional)", antes del cuestionario manual: flujo copia-pega de historia clínica → prompt generado → JSON de respuesta pegado → autorrelleno validado del cuestionario, sin llamadas a servicios externos desde la herramienta.
- Nuevo módulo `src/ai-extraction.mjs` que deriva el esquema de extracción y el prompt directamente del catálogo real de variables (`core.mjs`), y valida tipos/rangos del JSON de respuesta sin bloquear el uso manual ante errores.
- Marcado visual («IA — revisar») de los campos autorrellenados por IA hasta su revisión o edición manual.
- No se ha modificado la lógica del modelo CMO, el cuestionario manual, la exportación/impresión ni la atribución de autoría.

## 1.0.0 - 2026-07-21

- Aplicación inicial CMO-Migraña independiente.
- Motor de cálculo determinista, catálogo centralizado, guardado local, exportación e informe imprimible.
