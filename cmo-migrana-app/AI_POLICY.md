# Política de inteligencia artificial

**Esta herramienta no utiliza, no contrata y no llama a ningún modelo ni servicio de
inteligencia artificial generativa, gratuito o de pago (ni Azure OpenAI, ni OpenAI, ni
Anthropic/ChatGPT, ni ningún otro proveedor).** No existe integración con ninguna API externa
de IA. Una suscripción personal a un servicio de chat como ChatGPT no se considera ni se
utiliza como una API desde esta aplicación.

Versiones anteriores de esta sección exploraron dos enfoques basados en LLM externo (un flujo
de copia-pega de prompt/JSON, y después un flujo BYOK con llamada directa navegador→proveedor
con clave propia del usuario). Ambos enfoques, y todo el código asociado (`ai-extraction.mjs`,
`ai-providers.mjs`, `key-storage.mjs`), **se han eliminado por completo** del repositorio a
petición expresa: esta herramienta no debe presentarse como IA generativa ni depender de
ningún servicio externo.

## Preestratificación automática desde texto

La sección "Preestratificación automática desde texto" (colapsada por defecto, situada antes
del cuestionario manual) es un **analizador local de reglas**, no un modelo de lenguaje:

- Se ejecuta **íntegramente en el navegador** del farmacéutico, sobre el texto que él mismo
  pega. No realiza ninguna solicitud de red, no depende de conexión a internet una vez cargada
  la página, y no envía el texto a ningún servidor propio ni de terceros.
- Es **determinista y auditable**: usa expresiones regulares y heurísticas explícitas de
  negación, duda y antecedente familiar (ver `src/local-extractor.mjs`), no un modelo
  estadístico ni probabilístico. El mismo texto produce siempre exactamente el mismo resultado.
- Para cada variable del cuestionario CMO distingue entre **detectado**, **ausente
  explícitamente**, **dudoso o contradictorio** y **no mencionado**, y nunca convierte "no
  mencionado" en una respuesta negativa ni en una puntuación de cero.
- Cada propuesta conserva el **fragmento textual exacto** que la sustenta y la **regla** que la
  produjo, mostrados en una tabla de revisión antes de trasladar nada al cuestionario.
- **Ninguna propuesta se aplica al cuestionario sin confirmación individual explícita** del
  profesional (confirmar, corregir o rechazar variable por variable); no existe un botón de
  "aceptar todo".
- El esquema de variables se deriva siempre del catálogo real del cuestionario (`VARIABLES` en
  `core.mjs`), no de una copia mantenida a mano, para que nunca se desincronice del formulario.
- Los campos confirmados quedan marcados visualmente («Preestratificación — revisar») hasta que
  el farmacéutico los confirma de nuevo o los edita manualmente en el cuestionario.
- La lógica del modelo CMO, los pesos y los puntos de corte de estratificación (`core.mjs`) no
  se han modificado en absoluto por esta funcionalidad.
- Las limitaciones conocidas del analizador (alcance de la negación, umbrales clínicos externos
  aplicados de forma orientativa, variables sin regla de detección, listas de palabras clave no
  exhaustivas) están documentadas en el propio código (`LIMITATIONS` en `local-extractor.mjs`) y
  se muestran en la interfaz en un desplegable "Limitaciones conocidas del analizador".

Ver `PRIVACY.md` para el detalle de qué datos se conservan (ninguno del texto pegado ni de las
propuestas del analizador; solo los valores finalmente confirmados por el profesional, igual
que si los hubiera escrito a mano).
