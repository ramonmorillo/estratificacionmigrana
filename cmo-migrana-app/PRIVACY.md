# Privacidad

La aplicación funciona en navegador, sin analítica de terceros y sin envío intencionado de datos a servidores propios de la herramienta. Los casos se guardan en `localStorage` del navegador y pueden borrarse individualmente o en bloque. No deben introducirse identificadores directos reales.

La única excepción intencionada a "sin APIs clínicas externas" es la sección opcional "Extracción asistida por IA (opcional)", descrita a continuación: solo se activa si el propio usuario la configura explícitamente con su clave API personal (BYOK) y acepta el aviso de consentimiento.

## Sección de extracción asistida por IA

El texto de historia clínica pegado y la respuesta de la IA **viven únicamente en variables de memoria de la sesión del navegador** (nunca en `localStorage`, `sessionStorage`, `IndexedDB` ni cookies) y desaparecen al cerrar o recargar la pestaña. Solo las respuestas ya estructuradas (los mismos valores categóricos que produciría el relleno manual del cuestionario) pasan a formar parte del caso guardado, igual que si el farmacéutico las hubiera seleccionado a mano. El botón "Borrar todos los datos de esta extracción" limpia de golpe el texto de HC, el prompt/JSON del modo manual y las marcas de campos autorrellenados. Cambiar de caso (recuperar otro paciente o importar un JSON) limpia automáticamente esta sección.

**Flujo de un solo paso (BYOK):** el texto pegado se envía, mediante una llamada HTTPS directa desde el navegador (sin servidor intermedio de la herramienta), al proveedor de IA que el propio usuario ha configurado con su clave API personal (Azure OpenAI, OpenAI o Anthropic). Requiere consentimiento explícito la primera vez (registrado en `localStorage` como booleano + fecha, revocable). La clave API:
- por defecto ("solo esta sesión") vive solo en una variable de memoria y desaparece al recargar o cerrar la pestaña — verificable en DevTools > Application, no queda ningún rastro;
- si el usuario elige "recordar en este navegador", se cifra con AES-GCM (SubtleCrypto), derivando la clave de cifrado de una frase de paso mediante PBKDF2 (150.000 iteraciones); en `localStorage` solo se guarda el blob cifrado (`salt`, `iv`, `ciphertext` en base64), nunca la clave en texto plano; la frase de paso en sí nunca se almacena.

**Modo manual (fallback):** conserva el comportamiento original — el prompt y la respuesta JSON se pegan/copian manualmente y solo viven en memoria de sesión, igual que en la versión anterior de esta sección.
