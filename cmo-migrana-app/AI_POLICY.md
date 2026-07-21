# Política de IA

La versión inicial no utiliza LLM externo ni módulo de extracción automática desde texto libre. No se realizan inferencias automáticas desde texto clínico.

## Extracción asistida por IA (opcional, copia-pega)

Se ha añadido una sección opcional y colapsada por defecto, "Extracción asistida por IA (opcional)", situada antes del cuestionario manual. Características:

- La herramienta **no llama a ningún LLM ni API externa**. Todo el procesamiento (composición del prompt, parseo y validación del JSON de respuesta) ocurre íntegramente en el navegador del usuario.
- El flujo es de copia-pega bidireccional: el farmacéutico pega texto de historia clínica ya anonimizado por él mismo, la herramienta genera un prompt que el propio profesional debe llevar manualmente a un LLM corporativo autorizado por su centro (p. ej. Copilot, ChatGPT Enterprise, Gemini u otro validado por el servicio de farmacia), y después pega de vuelta la respuesta JSON del LLM en la herramienta.
- Se advierte explícitamente contra el uso de LLM públicos gratuitos con datos clínicos, incluso anonimizados.
- El esquema de campos del prompt se genera dinámicamente a partir del catálogo real de variables del cuestionario (`VARIABLES` en `core.mjs`), no de una copia mantenida a mano, para evitar desincronizaciones.
- La IA debe devolver `null` para cualquier campo sin información suficiente en el texto (nunca debe inventar valores) y debe aportar citas textuales de trazabilidad clínica para cada campo extraído.
- Los valores devueltos por la IA se validan (tipo y pertenencia al conjunto de opciones permitidas) antes de aplicarse al cuestionario; los campos con incidencias se reportan sin bloquear el uso manual del formulario.
- Los campos autorrellenados por IA quedan marcados visualmente («IA — revisar») hasta que el farmacéutico los confirma o los edita manualmente.
- La lógica del modelo CMO, los pesos y los puntos de corte de estratificación (`core.mjs`) no se han modificado en absoluto por esta funcionalidad.

Ver `PRIVACY.md` para el detalle de qué datos de esta sección se conservan (ninguno, más allá de la memoria de la sesión en curso).
