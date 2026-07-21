# Privacidad

La aplicación funciona en navegador, sin analítica de terceros, **sin ninguna API clínica ni
de inteligencia artificial externa**, y sin envío intencionado de datos a ningún servidor. Los
casos se guardan en `localStorage` del navegador y pueden borrarse individualmente o en bloque.
No deben introducirse identificadores directos reales.

## Sección "Preestratificación automática desde texto"

El análisis es **100% local**: se ejecuta en el navegador mediante un motor de reglas
determinista (`src/local-extractor.mjs`), sin llamar a ningún modelo ni servicio de IA, sin
realizar ninguna solicitud de red y sin necesidad de conexión a internet una vez cargada la
página.

- El texto pegado y las propuestas del analizador **viven únicamente en variables de memoria
  de la sesión del navegador** (nunca en `localStorage`, `sessionStorage`, `IndexedDB` ni
  cookies) y desaparecen al cerrar o recargar la pestaña — verificable en DevTools >
  Application, no queda ningún rastro.
- Solo los valores que el profesional confirma explícitamente pasan a formar parte del caso
  guardado, exactamente igual que si los hubiera seleccionado a mano en el cuestionario.
- El botón "Borrar todos los datos de este análisis" limpia de golpe el texto pegado, las
  propuestas de la tabla de revisión y las marcas de campos confirmados.
- Cambiar de caso (recuperar otro paciente o importar un JSON) limpia automáticamente esta
  sección.
- Aunque el procesamiento es local, se advierte igualmente al profesional que evite
  identificadores directos del paciente antes de pegar el texto.

No existe ninguna clave API, credencial, endpoint ni configuración de proveedor externo en esta
herramienta: no hay nada de eso que guardar, cifrar ni revocar.
