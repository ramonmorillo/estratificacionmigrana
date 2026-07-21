# Changelog

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
