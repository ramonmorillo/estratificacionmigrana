# Plan de mejoras — Herramienta CMO-migraña

**Fecha:** 2026-07-21
**Basado en:** `AUDITORIA.md` (Fase 1, aprobada por el autor)
**Fase:** 2 — Plan de mejoras (no se ha modificado ningún fichero de código; este documento propone acciones, no las ejecuta)

## Cómo leer este plan

- **Bloque A** — cambios técnicos puros: refactor sin alterar resultados, accesibilidad, rendimiento, estética, meta-tags, errores de build, tests, CI, documentación. Se aprueban **en bloque** (una única aprobación cubre todos los ítems de Bloque A, salvo que usted excluya alguno explícitamente).
- **Bloque B** — cambios que tocan el modelo clínico, la asignación de variables a dimensiones, textos clínicos visibles, o decisiones con impacto asistencial/de protección de datos. Requieren **aprobación individual por ID** antes de implementarse. Ninguno se ejecutará sin ese OK explícito.
- La columna "Requiere aprobación individual (S/N)" indica si, dentro de su bloque, el ítem necesita además una confirmación específica (por ejemplo, por tratarse de una decisión con alternativas, aunque sea técnica).
- Ningún ítem de este plan cambia el resultado de `scoreCase()` para ningún caso ya existente; donde eso no pueda garantizarse, el ítem se reclasifica automáticamente a Bloque B (regla del encargo).

---

## Bloque A — Cambios técnicos (aprobación en bloque)

| ID | Hallazgo | Dimensión | Severidad | Acción propuesta | Riesgo si se aplica | Bloque | Aprob. individual |
|---|---|---|---|---|---|---|---|
| M-001 | H-009 | D3 | Baja | Añadir favicon mínimo (SVG/ICO) para eliminar el error 404 de consola | Ninguno; sin dependencias nuevas | A | N |
| M-002 | H-008 | D3 | Alta | Envolver la tabla de "Contribuciones" en un contenedor `overflow-x:auto` (o layout de tarjeta en móvil), sin cambiar contenido | Ninguno; cambio de CSS puro, verificable visualmente | A | N |
| M-003 | H-010 | D3 | Media | Añadir `<noscript>` con mensaje mínimo en los 3 HTML (`index.html` raíz, `404.html`, `cmo-migrana-app/index.html`) | Ninguno | A | N |
| M-004 | H-011 | D3 / atribución | Media | Añadir `meta name="author"`, `meta property="og:title"`, `meta property="og:description"` en los 3 HTML estáticos | Ninguno | A | N |
| M-005 | H-012 | D3 | Baja | Desarrollar "Capacidad–Motivación–Oportunidad (CMO)" en la primera mención dentro de la interfaz (cabecera) | Ninguno; solo texto terminológico, no clínico | A | N |
| M-006 | H-013 | D1/D4/atribución | Crítica (estructural) | Crear sección "Acerca de / Metodología" en la app, con el bloque "Base metodológica" y el marcador `<!-- METHODOLOGY_REF_PLACEHOLDER v1 -->` (texto ya literal, aportado por usted en el encargo) | Bajo; es una sección nueva, no reescribe nada existente. El texto es el literal que usted ya proporcionó, no interpretación mía | A | N |
| M-007 | H-017 | Atribución | Alta | Insertar "Herramienta creada por Ramón Morillo-Verdugo — julio de 2026." en footer, sección Acerca de, README, `package.json` (`author`), pie del informe/exportable (textos literales de §5.b) | Ninguno | A | N |
| M-008 | H-019 | Versionado | Baja | Añadir entrada `CHANGELOG.md` con el texto literal exigido en C10, conservando la entrada técnica ya existente | Ninguno | A | N |
| M-009 | H-007 | D4 | Media | Añadir etiquetas de sección "Datos introducidos" / "Resultado del algoritmo" / "Actuaciones sugeridas" en el informe imprimible/exportable, sin tocar ningún texto clínico existente | Bajo; solo estructura, no contenido | A | N |
| M-010 | H-004 | D1 | Media | Separar visualmente en la interfaz "Resultado de estratificación" de "Actuaciones derivadas (intervención)" mediante subtítulos, sin tocar el motor de cálculo | Bajo; solo maquetación | A | N |
| M-011 | H-003 | D1 | Baja | Mejorar legibilidad del catálogo de variables (formateo, agrupación visual de puntuaciones) sin cambiar ningún valor | Ninguno; test de regresión verifica resultados idénticos | A | N |
| M-012 | H-021 | Técnico | Baja | Reformatear `core.mjs` y `main.js` con Prettier (ya disponible en el entorno, sin nueva dependencia de producción) | Ninguno; test de regresión obligatorio antes de aceptar el cambio | A | N |
| M-013 | H-020 | Técnico | Baja | Corregir en `TEST_PLAN.md` la mención errónea a "Vitest" por "test runner nativo de Node (`node --test`)" | Ninguno | A | N |
| M-014 | H-023 | Técnico/UX | Baja | Sustituir `prompt()`/`alert()`/`confirm()` por un formulario/modal in-page accesible, manteniendo los mismos campos y la justificación obligatoria del override | Bajo-medio; requiere verificar que la obligatoriedad de justificación se preserva exactamente | A | N |
| M-015 | H-024 | Técnico | Baja | Añadir pruebas E2E ligeras (Playwright, ya disponible en el entorno) para guardar/exportar/borrar/override en la interfaz | Ninguno | A | N |
| M-016 | H-015 | Seguridad | Media | Añadir texto de ayuda visible junto al campo de pseudónimo recordando no introducir identificadores directos reales | Ninguno; no bloquea ni valida contenido | A | N |
| M-017 | H-016 | Seguridad | Media | Añadir aviso visible en el momento de exportar (JSON/CSV/informe) recordando no incluir identificadores directos | Ninguno | A | N |
| M-018 | H-006 (parcial) | D2 | Alta | Hacer más visible en la UI el indicador ya existente de "pendiente de verificación documental" en las variables con definición genérica (no completa las definiciones, solo las señala con más claridad) | Ninguno; no inventa ningún criterio clínico | A | N |
| M-019 | H-022 | Técnico | Baja | Añadir workflow de GitHub Actions (test + build + verificación de sincronía `dist`/raíz) | Bajo; toca el proceso de publicación, no el código de producción — ver nota | A | **S** |

**Nota sobre M-019:** aunque es un cambio puramente técnico, modifica el proceso de despliegue a GitHub Pages. Lo incluyo en Bloque A pero marcado con aprobación individual porque afecta a cómo se publica la herramienta (aunque no a su contenido). Si prefiere, puedo excluirlo de la aprobación en bloque y tratarlo aparte.

---

## Bloque B — Cambios con impacto clínico o de datos (aprobación individual obligatoria)

| ID | Hallazgo | Dimensión | Severidad | Acción propuesta | Riesgo si se aplica | Bloque | Aprob. individual |
|---|---|---|---|---|---|---|---|
| M-020 | H-001 / H-002 | D1 | **Crítica** | Aclarar y, si procede, incorporar el mapeo de las 23 variables existentes a Capacidad/Motivación/Oportunidad — **sin añadir, eliminar ni repuntuar ninguna variable** | Alto si se hace sin su validación explícita: cualquier reetiquetado de dimensiones puede alterar la interpretación del modelo aunque no cambie la puntuación numérica | B | **S** |
| M-021 | H-014 | Seguridad | Alta | Decidir entre mantener `localStorage` o migrar a `sessionStorage` para la persistencia de casos (ver pros/contras abajo) | Medio: cualquiera de las dos opciones cambia el comportamiento observable para el farmacéutico (pérdida de casos al cerrar navegador, o persistencia más allá de la sesión) | B | **S** |
| M-022 | H-005 | D2 | Baja | Confirmar si `paciente_naive` debe seguir sin puntuar (0 pts, informativo) o si debería aportar puntuación en alguna dimensión | Bajo, pero toca la lógica de puntuación si cambia | B | **S** |
| M-023 | H-006 (completo) | D2 | Alta | Completar las definiciones operativas genéricas (HIT-6/MIDAS, definición de pluripatología, umbral de uso excesivo, etc.) cuando se aporte el documento fuente | Alto si se completa sin el documento: se estaría inventando criterio clínico, expresamente prohibido | B | **S** — y además `[PENDIENTE DE APORTAR POR EL AUTOR]`: no se ejecutará hasta recibir el documento o los criterios exactos |

---

## Decisiones que requieren su elección explícita (no elijo por usted)

### 1. M-020 — Mapeo Capacidad/Motivación/Oportunidad (H-001/H-002)

No propongo una solución porque no dispongo de la documentación fuente ni debo inventar el mapeo. Necesito que usted indique una de estas rutas (o una distinta):

- **(a)** Existe un mapeo variable→C/M/O en el documento fuente (aún no público) que debe incorporarse literalmente cuando lo aporte. Mientras tanto, no se toca nada.
- **(b)** Las 4 categorías actuales (demográficas/clínicas/farmacoterapéuticas/sociosanitarias) **son** la forma en que usted ha operacionalizado C/M/O y hay que documentar explícitamente esa correspondencia (p. ej. "estas categorías se agrupan bajo Capacidad: X, Y; Motivación: Z; Oportunidad: W") sin cambiar el algoritmo.
- **(c)** Otra explicación que usted me indique.

Sin su respuesta, este ítem queda pendiente y no se implementa nada relacionado con M-020.

### 2. M-021 — `localStorage` vs `sessionStorage` (H-014)

| Opción | A favor | En contra |
|---|---|---|
| **Mantener `localStorage`** | El farmacéutico puede cerrar el navegador entre pacientes de una misma consulta y recuperar el caso; menor riesgo de pérdida de trabajo en consulta | No cumple literalmente el requisito del encargo ("limitarse a la sesión activa"); los datos permanecen en el dispositivo hasta borrado manual, con el riesgo que eso implica si el equipo es compartido |
| **Migrar a `sessionStorage`** | Cumple literalmente el requisito de protección de datos; los casos desaparecen automáticamente al cerrar la pestaña/navegador, reduciendo el riesgo en equipos compartidos | El farmacéutico pierde el caso si cierra el navegador por error o cambia de pestaña de forma que el navegador la descarga; puede ser una fricción real en consulta con interrupciones |

No elijo por usted. Si lo prefiere, puedo implementar una tercera vía intermedia (p. ej. `sessionStorage` por defecto con un aviso claro, y un botón explícito de "exportar antes de cerrar"), pero requeriría su aprobación igualmente al ser una decisión de protección de datos con efecto clínico-práctico.

### 3. Licencia (H-018) — solo propuesta, sin aplicar

El encargo pide proponer una licencia sin aplicarla si no existe ninguna. Opciones habituales para una herramienta de referencia pensada para ser usada (no modificada comercialmente) por otros farmacéuticos hospitalarios:

| Opción | Qué permite | Qué implica |
|---|---|---|
| **MIT** | Uso, copia, modificación y redistribución libres, incluso comercial, con solo mantener el aviso de copyright | Máxima adopción, mínima fricción; no impide usos que usted no controle |
| **CC BY-NC-SA 4.0** | Uso y adaptación no comercial, con atribución obligatoria y misma licencia en derivados | Más alineado con un contexto asistencial/institucional (SEFH/MAPEX), impide explotación comercial de terceros |
| **Todos los derechos reservados (sin licencia abierta), con nota de autorización de uso clínico no comercial** | Máximo control del autor; uso permitido solo bajo los términos que usted redacte | Menor adopción espontánea por otros hospitales; requiere que usted redacte el texto de autorización |

No se aplicará ninguna hasta que usted elija.

---

## Orden de ejecución propuesto para Fase 3 (si aprueba Bloque A en bloque)

1. M-001, M-002, M-003 (correcciones técnicas de mayor severidad/menor riesgo primero: favicon, overflow móvil, noscript).
2. M-006, M-007, M-004, M-008 (estructura Acerca de + atribución + meta-tags + changelog — Fase 4 del encargo, agrupable aquí por eficiencia si usted lo prefiere).
3. M-009, M-010, M-016, M-017, M-018 (trazabilidad y avisos de datos).
4. M-005, M-011, M-012, M-013 (legibilidad y documentación).
5. M-014, M-015 (UX de diálogos y tests E2E).
6. M-019 si se aprueba individualmente.

Un commit por ID, referenciando el ID en el mensaje, tal como exige el encargo.

---

**Quedo a la espera de:**
1. Su aprobación en bloque de los ítems de Bloque A (M-001 a M-019, con la salvedad de M-019 que pide aprobación individual).
2. Su decisión individual, por ID, sobre M-020, M-021, M-022 y M-023 (Bloque B).
3. Su elección sobre la licencia (o "ninguna por ahora").

No implementaré nada hasta recibir estas aprobaciones.
