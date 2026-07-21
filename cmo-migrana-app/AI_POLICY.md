# Política de IA

La versión inicial no utiliza LLM externo ni módulo de extracción automática desde texto libre. No se realizan inferencias automáticas desde texto clínico.

## Extracción asistida por IA (opcional)

Se ha añadido una sección opcional y colapsada por defecto, "Extracción asistida por IA (opcional)", situada antes del cuestionario manual.

### Flujo principal: un solo paso, BYOK (Bring Your Own Key)

Desde la versión 1.2.0, el flujo principal es de un solo botón: el farmacéutico pega el evolutivo/HC ya anonimizado y pulsa "Extraer y prerrellenar cuestionario". La herramienta llama **directamente desde el navegador** (fetch HTTPS, sin backend propio) a la API del proveedor de IA que el propio usuario ha configurado con su clave personal (Azure OpenAI, OpenAI o Anthropic). No hay ningún servidor intermedio de la herramienta: la clave y el texto viajan solo entre el navegador del farmacéutico y el proveedor elegido.

- Antes de la primera llamada se exige un consentimiento explícito (modal bloqueante) que recuerda la responsabilidad del usuario/institución sobre el cumplimiento normativo y el contrato con el proveedor, y advierte contra el uso de proveedores no autorizados por el centro. El consentimiento se recuerda en `localStorage` (booleano + fecha) y puede revocarse en cualquier momento desde el panel de configuración (⚙️).
- Un aviso permanente, no descartable, recuerda en todo momento que el texto se envía al proveedor configurado en cuanto se pulsa el botón.
- Si la respuesta no es JSON válido, se reintenta automáticamente una vez con una instrucción reforzada; si el segundo intento también falla, o si la conexión falla (red, 401/403, 429, 5xx, timeout de 60 s), se muestra un mensaje específico y se ofrece siempre el modo manual como alternativa.
- La clave API, por defecto, vive únicamente en memoria durante la sesión ("solo esta sesión"). Si el usuario elige "recordar en este navegador", se cifra con AES-GCM (SubtleCrypto) derivando la clave de cifrado de una frase de paso mediante PBKDF2; nunca se guarda en texto plano.

### Modo manual (fallback), oculto tras un enlace

El flujo de copia-pega bidireccional original (generar prompt → copiarlo a un LLM corporativo autorizado → pegar la respuesta JSON) se conserva íntegro para los centros que no puedan autorizar llamadas directas a una API externa. Está oculto por defecto tras el enlace "Modo manual (fallback)" y se activa automáticamente como alternativa cuando el flujo de un solo paso falla dos veces. Sigue advirtiendo explícitamente contra el uso de LLM públicos gratuitos con datos clínicos.

### Common a ambos flujos

- El esquema de campos del prompt (y su validación) se genera y se reutiliza siempre a partir del catálogo real de variables del cuestionario (`VARIABLES` en `core.mjs`, vía `ai-extraction.mjs`), no de una copia mantenida a mano.
- La IA debe devolver `null` para cualquier campo sin información suficiente (nunca debe inventar valores) y debe aportar citas textuales de trazabilidad clínica para cada campo extraído.
- Los valores devueltos se validan (tipo y pertenencia al conjunto de opciones permitidas) antes de aplicarse al cuestionario; los campos con incidencias se reportan sin bloquear el uso manual del formulario.
- Los campos autorrellenados quedan marcados visualmente («IA — revisar») hasta que el farmacéutico los confirma o los edita manualmente.
- La lógica del modelo CMO, los pesos y los puntos de corte de estratificación (`core.mjs`) no se han modificado en absoluto por esta funcionalidad.

Ver `PRIVACY.md` para el detalle de qué datos de esta sección se conservan (ninguno del texto clínico o la respuesta; opcionalmente, la clave API cifrada).
