# Privacidad

La aplicación funciona en navegador, sin analítica de terceros, sin APIs clínicas externas y sin envío intencionado de datos. Los casos se guardan en `localStorage` del navegador y pueden borrarse individualmente o en bloque. No deben introducirse identificadores directos reales.

## Sección de extracción asistida por IA

El texto de historia clínica pegado, el prompt generado y el JSON de respuesta de la IA **viven únicamente en variables de memoria de la sesión del navegador** (nunca en `localStorage`, `sessionStorage`, `IndexedDB` ni cookies) y desaparecen al cerrar o recargar la pestaña. Solo las respuestas ya estructuradas (los mismos valores categóricos que produciría el relleno manual del cuestionario) pasan a formar parte del caso guardado, igual que si el farmacéutico las hubiera seleccionado a mano. El botón "Borrar datos de esta extracción" limpia de golpe el texto de HC, el prompt, el JSON y las marcas de campos autorrellenados. Cambiar de caso (recuperar otro paciente o importar un JSON) limpia automáticamente esta sección.
