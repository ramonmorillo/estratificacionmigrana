# Auditoría — Herramienta CMO-migraña

**Fecha:** 2026-07-21
**Autor del encargo:** Ramón Morillo-Verdugo (SEFH / MAPEX)
**Alcance:** Repositorio `ramonmorillo/estratificacionmigrana`, rama `claude/auditoria-cmo-migrana-qy4m6c` (sin diferencias respecto a `main` en el momento de esta auditoría).
**Fase:** 1 — Auditoría (no se ha modificado ningún fichero de código; este documento es de solo lectura sobre el estado actual).

## Nota metodológica obligatoria

La documentación interna del modelo Capacidad–Motivación–Oportunidad (CMO) aplicado a migraña dentro de MAPEX **no** se ha aportado a esta auditoría. En consecuencia, la dimensión D1 se audita **solo en su coherencia interna** (qué hace el código, si es determinista, si es explicable) y **no se compara** contra ninguna fuente externa. No se han inventado variables, puntos de corte, escalas ni referencias bibliográficas. Los vacíos documentales detectados se marcan `[PENDIENTE DE APORTAR POR EL AUTOR]`.

Cada hallazgo se etiqueta con **ID**, **dimensión** (D1–D4, o transversal: seguridad/atribución/técnico), **severidad** {crítica, alta, media, baja} y se estructura en tres capas separadas: **DATO** (observación verificable) / **INTERPRETACIÓN** (lectura profesional del dato) / **RECOMENDACIÓN** (acción propuesta, sin ejecutar en esta fase).

---

## Índice de hallazgos

| ID | Dimensión | Severidad | Título |
|---|---|---|---|
| H-001 | D1 | **Crítica** | Ausencia total de mapeo Capacidad/Motivación/Oportunidad en el código |
| H-002 | D1 | Alta | El algoritmo combina 4 categorías propias, no C+M+O explícitamente |
| H-003 | D1 | Baja | Puntuaciones por opción como literales sin constante nombrada (los umbrales de prioridad sí están nombrados) |
| H-004 | D1 | Media | Estratificación e intervención separadas en el motor, pero no en la interfaz |
| H-005 | D2 | Baja | Variable informativa sin puntuación (`paciente_naive`): confirmar intencionalidad |
| H-006 | D2 | Alta | 10 de 23 variables con definición operativa genérica ("según documento") pendiente de fuente |
| H-007 | D4 | Media | El informe exportable no etiqueta explícitamente DATO / INTERPRETACIÓN / RECOMENDACIÓN |
| H-008 | D3 | Alta | Overflow horizontal real en móvil (375 px) causado por la tabla de contribuciones |
| H-009 | D3 | Baja | Lighthouse Best Practices 96/100 por error de consola (favicon ausente) |
| H-010 | D3 | Media | Sin JavaScript: página en blanco, sin `<noscript>` explicativo |
| H-011 | D3 | Media | Faltan meta-etiquetas `author`, `og:title`, `og:description` en el HTML servido |
| H-012 | D3 | Baja | Primera mención de "CMO" en la interfaz sin desarrollar la sigla |
| H-013 | D1/D4/atribución | **Crítica** | No existe sección "Acerca de / Metodología" ni mención a MAPEX, SEFH o autoría en la app |
| H-014 | Seguridad | Alta | Persistencia en `localStorage` (indefinida) en vez de limitada a la sesión activa |
| H-015 | Seguridad | Media | Campo de pseudónimo sin advertencia visible in-situ sobre identificadores directos |
| H-016 | Seguridad | Media | Exportaciones (JSON/CSV/informe) sin advertencia en el momento de exportar |
| H-017 | Atribución | Alta | Ausencia total de atribución de autoría (§5.b del encargo) |
| H-018 | Licencia | Baja | No existe fichero `LICENSE` |
| H-019 | Versionado | Baja | `CHANGELOG.md` no usa el texto literal exigido para la entrada 1.0.0 |
| H-020 | Técnico | Baja | `TEST_PLAN.md` menciona "Vitest" incorrectamente (el proyecto usa `node --test`) |
| H-021 | Técnico | Baja | Código fuente en una única línea por fichero: dificulta la auditoría y el control de versiones |
| H-022 | Técnico | Baja | Sin CI/GitHub Actions; riesgo de desincronización entre `src/` y los ficheros raíz de GitHub Pages |
| H-023 | Técnico/UX | Baja | Uso de `prompt()`/`alert()`/`confirm()` nativos para override, importación y borrado |
| H-024 | Técnico | Baja | `src/main.js` (interfaz) sin ninguna cobertura de tests; solo `core.mjs` está cubierto |
| H-025 | Seguridad | Positivo (informativo) | Cero llamadas de red externas y cero dependencias npm |
| H-026 | D3 | Positivo (informativo) | axe-core (WCAG 2.0/2.1/2.2 A/AA): 0 violaciones detectadas |
| H-027 | D4 | Positivo (informativo) | El override clínico manual no altera el resultado algorítmico subyacente (verificado por test) |
| H-028 | D1/D2 | Positivo (informativo) | Cobertura de tests de `core.mjs`: 100 % líneas, 93,3 % ramas, 97,1 % funciones |

---

## 1.1 Inventario técnico

**DATO:**
- Stack: HTML + CSS + JavaScript (ES modules nativos). Sin framework, sin bundler, sin transpilación.
- `package.json` no declara ningún campo `dependencies` ni `devDependencies`. Scripts: `dev` (servidor estático Python), `build` (copia a `dist/`), `build:pages` (genera `index.html`/`404.html` en la raíz para GitHub Pages), `test` (`node --test`).
- Estructura de carpetas: `cmo-migrana-app/{src,test,scripts,dist}` + ficheros de gobernanza (`AI_POLICY.md`, `CLINICAL_RULES.md`, `LEGAL_NOTICE.md`, `PRIVACY.md`, `README.md`, `SOURCE_MAPPING.md`, `TEST_PLAN.md`, `VERSION.md`). Raíz del repo: `index.html`, `404.html` (copias generadas para GitHub Pages).
- `npm test` → 10/10 tests pasan (`node --test`, ver detalle en 1.4).
- `npm run build` → ejecuta sin errores; `dist/` verificado idéntico a `src/` e `index.html` (sin desincronización en el momento de la auditoría).
- No hay vulnerabilidades de dependencias que auditar: no hay dependencias de terceros en producción ni en desarrollo.
- No existe `.github/` (sin CI).

**INTERPRETACIÓN:** Superficie de ataque de cadena de suministro mínima (fortaleza). A cambio, el proceso de publicación a GitHub Pages es manual (regenerar y commitear `index.html`/`404.html`), lo que introduce riesgo de desincronización si en el futuro alguien edita `src/` sin ejecutar `npm run build:pages` (H-022).

**RECOMENDACIÓN:** Ver H-020, H-021, H-022, H-024 (Bloque A, técnicas puras).

---

## 1.2 Coherencia interna del modelo Capacidad–Motivación–Oportunidad (D1)

### H-001 — Ausencia total de mapeo Capacidad/Motivación/Oportunidad en el código [**CRÍTICA**, D1]

**DATO:** `grep -rniE "capacidad|motivaci|oportunidad"` sobre todo el repositorio (código, HTML, CSS, Markdown) devuelve 0 coincidencias, salvo el propio texto "modelo CMO" sin desarrollar. La constante `DIMENSIONS` en `core.mjs` define las categorías `demograficas`, `clinicas`, `farmacoterapeuticas`, `sociosanitarias` — no `capacidad`, `motivacion`, `oportunidad`.

**INTERPRETACIÓN:** La herramienta se llama y se presenta como "CMO", pero no existe en el código, la interfaz ni la documentación ningún punto donde pueda verificarse qué variable corresponde a Capacidad, cuál a Motivación y cuál a Oportunidad, ni cómo se pondera cada una de esas tres dimensiones. Esto no significa necesariamente que el modelo esté mal implementado — puede ser que las 4 categorías actuales sean una taxonomía de recogida de datos previa a una clasificación C/M/O que aún no se ha incorporado, o que el mapeo exista en el documento fuente no aportado — pero, tal como está el código hoy, **no es verificable**.

**RECOMENDACIÓN:** No se propone ningún cambio de código en esta fase (regla epistémica: cualquier incoherencia entre código y modelo CMO requiere parar y preguntar). Se traslada como pregunta directa: **¿las 4 categorías actuales (demográficas/clínicas/farmacoterapéuticas/sociosanitarias) deben mapearse a Capacidad/Motivación/Oportunidad, y si es así, cuál es ese mapeo?** Bloque B, aprobación individual obligatoria antes de cualquier acción.

### H-002 — El algoritmo combina 4 categorías propias, no "C+M+O" explícitamente [ALTA, D1]

**DATO:** `scoreCase()` sí es un algoritmo explícito, determinista y reproducible: para cada variable busca la opción seleccionada, suma su puntuación dentro de su categoría (`subtotals`), suma los subtotales (`total`, máximo 40) y aplica umbrales nombrados (`THRESHOLDS`) para obtener una prioridad 1/2/3. Mismas respuestas → mismo resultado siempre (sin aleatoriedad ni estado oculto), verificado por test.

**INTERPRETACIÓN:** El algoritmo de combinación es sólido en términos de ingeniería (determinismo, reproducibilidad), pero combina las 4 categorías citadas, no "Capacidad + Motivación + Oportunidad" de forma nominal. Es el mismo vacío que H-001 visto desde el ángulo del algoritmo de combinación.

**RECOMENDACIÓN:** Ninguna acción de código en esta fase; depende de la resolución de H-001. Bloque B.

### H-003 — Puntuaciones por opción como literales sin constante nombrada [BAJA, D1]

**DATO:** Los umbrales de prioridad (`p1Min:19, p2Min:15, p2Max:18, p3Max:14`) **sí** están nombrados como constantes (`THRESHOLDS`). Sin embargo, las puntuaciones individuales de cada opción (ej. `opt('alto', 'Impacto/discapacidad alto', 2, ...)`) son literales numéricos inline dentro del array `VARIABLES`, sin una constante propia, aunque cada una va acompañada de una etiqueta y una definición textual.

**INTERPRETACIÓN:** No hay "números mágicos" sin explicación textual — cada puntuación tiene `label` y `definition` junto a ella — pero la falta de nombres de constante dificulta una revisión rápida de "qué puntúa cuánto" sin leer el array completo línea por línea (agravado por H-021, código en una sola línea).

**RECOMENDACIÓN:** Mejora de legibilidad pura (sin cambiar ningún valor ni resultado). Candidata a Bloque A. Se detallará en `PLAN_MEJORAS.md`.

### H-004 — Estratificación e intervención separadas en el motor, pero no en la interfaz [MEDIA, D1]

**DATO:** En `core.mjs`, `scoreCase()` (clasificación) y `cumulativeInterventions()` (actuaciones) son funciones independientes. En `main.js`, sin embargo, la sección `<h2>3. Resumen y resultado</h2>` presenta consecutivamente, sin separación estructural (mismo `<section>`, sin subtítulo diferenciador claro): prioridad final, contribuciones, override, periodicidad **y** "Actuaciones farmacéuticas acumulativas".

**INTERPRETACIÓN:** A nivel de motor de cálculo, estratificar (clasificar) e intervenir (actuar) están correctamente desacoplados. A nivel de interfaz, se presentan como un bloque único, sin un límite visual explícito entre "esto es el resultado de la clasificación" y "esto es lo que se deriva de esa clasificación". Esto puede inducir a percibir ambas fases como indivisibles, lo que la regla 5 del encargo pide señalar.

**RECOMENDACIÓN:** Reordenar visualmente en subsecciones con encabezados diferenciados ("Resultado de estratificación" / "Actuaciones derivadas — intervención"), sin tocar el contenido clínico ni el algoritmo. Candidata a Bloque A (solo maquetación). Se detallará en `PLAN_MEJORAS.md`.

---

## 1.3 Cobertura clínica en migraña (D2)

**DATO — inventario completo de variables (23) y su asignación actual a categoría** (no C/M/O, ver H-001):

| Categoría (según código) | Máximo | Variables |
|---|---|---|
| `demograficas` | 3 pts | `situacion_reproductiva`*, `edad`*, `sexo`, `peso_estado_nutricional` |
| `clinicas` | 10 pts | `tipo_frecuencia_migrana`, `impacto_discapacidad`, `comorbilidades_psiquiatricas`, `comorbilidades_no_psiquiatricas`, `comorbilidades_cardiovasculares`, `pluripatologia` |
| `farmacoterapeuticas` | 21 pts | `paciente_naive`†, `via_administracion`, `riesgo_interacciones`, `fracasos_anti_cgrp`, `uso_excesivo_sintomatica`, `cambios_tratamiento`, `efectos_adversos`, `falta_adherencia`, `medicamentos_alto_riesgo` |
| `sociosanitarias` | 6 pts | `consumo_cafeina`, `habitos_sueno`, `nivel_socioeconomico`, `formacion_paciente` |

\* `situacion_reproductiva` (embarazo/lactancia/deseo gestacional) y `edad` (menor de 18) no puntúan (0 pts) pero activan reglas automáticas: prioridad automática 1, o derivación a modelo pediátrico.
† `paciente_naive` puntúa 0 en ambas opciones; su propia definición la marca como "informativa".

No se han añadido, eliminado ni reasignado variables para esta auditoría.

### H-005 — Variable informativa sin puntuación: confirmar intencionalidad [BAJA, D2]

**DATO:** `paciente_naive` tiene sus dos opciones (`tratado`, `naive`) con `score: 0` y definición explícita "Informativo.".

**INTERPRETACIÓN:** Es coherente con su propia etiqueta (no parece un error de omisión), pero conviene confirmación explícita de que, en efecto, no debe contribuir a ninguna puntuación.

**RECOMENDACIÓN:** Ninguna acción de código. Confirmación del autor cuando lo considere oportuno (Bloque B, sin urgencia).

### H-006 — Definiciones operativas genéricas pendientes de documento fuente [ALTA, D2]

**DATO:** 10 de las 23 variables remiten literalmente a "el documento" para su criterio operativo exacto, sin especificarlo en el propio código: `tipo_frecuencia_migrana` ("según límites del documento"), `impacto_discapacidad` ("puntos de corte HIT-6 y MIDAS según documento"), `pluripatologia` ("según definición operativa del documento"), `uso_excesivo_sintomatica`, `efectos_adversos`, `nivel_socioeconomico`, `formacion_paciente`, `sexo`, `peso_estado_nutricional`, `consumo_cafeina`. Además, `sourcePage` de **todas** las variables contiene literalmente `"PDF no disponible en repositorio; pendiente de verificación literal"`.

**INTERPRETACIÓN:** Esto ya está declarado explícitamente por el propio repositorio (`SOURCE_MAPPING.md`, `README.md`, `CLINICAL_RULES.md`) — no es un error oculto. Pero implica que, en ~el 43 % de las variables, un farmacéutico no dispone hoy del punto de corte, escala o criterio operativo exacto (p. ej. no conoce el umbral HIT-6/MIDAS concreto, ni la definición operativa de "pluripatología" o de "uso excesivo") hasta que se aporte el documento fuente.

**RECOMENDACIÓN:** `[PENDIENTE DE APORTAR POR EL AUTOR]`. Ninguna acción de código: no se debe inventar ningún criterio, escala o punto de corte. Cuando se aporte el documento (`Output IV Taller CMO migraña_160726.pdf` u otro), sustituir `sourcePage` y las definiciones genéricas por el texto literal correspondiente.

---

## 1.4 Trazabilidad (D4)

**DATO / respuestas a las preguntas guía:**

- **¿Puede el farmacéutico ver qué variables han empujado el resultado?** Sí. `scoreCase()` devuelve `contributions[]` con variable, opción elegida y puntuación de cada una, mostrado en tabla en la sección 3 de la interfaz y en el informe exportable. Verificado por test (`impresión contiene resultado explicación periodicidad e intervenciones`).
- **¿Los datos ausentes se tratan de forma segura?** Sí: se listan explícitamente como `missing` y el estado pasa a "Provisional por información incompleta"; no se asumen como 0 de forma silenciosa (verificado por test `datos ausentes no suman cero silenciosamente`). Fortaleza (H-027 relacionado).
- **¿Se puede exportar un informe?** Sí: JSON, CSV, texto plano descargable e impresión (`window.print()`).
- **¿El informe distingue DATO / INTERPRETACIÓN / RECOMENDACIÓN?** No explícitamente (H-007).

### H-007 — El informe exportable no etiqueta explícitamente las tres capas [MEDIA, D4]

**DATO:** `printableReport()` genera un texto con las secciones "Resultado / Paciente / Prioridad final / Puntuación / Explicación / Periodicidad de reevaluación / Periodicidad de seguimiento / Intervenciones", sin ninguna etiqueta "DATO", "INTERPRETACIÓN" o "RECOMENDACIÓN".

**INTERPRETACIÓN:** El informe es trazable (se ve qué variable llevó a qué puntuación) pero no separa formalmente la capa de dato objetivo (respuestas introducidas) de la interpretación algorítmica (prioridad calculada) y de la recomendación profesional (actuaciones sugeridas), que es un requisito transversal explícito del encargo y del propio criterio D4.

**RECOMENDACIÓN:** Añadir etiquetas de sección al informe/exportable (p. ej. "Datos introducidos" / "Resultado del algoritmo" / "Actuaciones sugeridas"), sin alterar ningún texto clínico existente. Candidata a Bloque A (solo estructura del informe). Se detallará en `PLAN_MEJORAS.md`.

### H-027 — El override clínico no altera el resultado algorítmico subyacente [Positivo, D4]

**DATO:** Un test verifica explícitamente (`override no modifica resultado automático`) que al fijar manualmente una prioridad distinta, `algorithmPriority` (el resultado calculado) permanece intacto y solo `finalPriority` cambia, quedando registrados `from`, `to`, `justification` y `createdAt`.

**INTERPRETACIÓN:** Esto es exactamente la separación deseable entre "lo que dice el algoritmo" y "lo que decide el profesional", con trazabilidad completa de la decisión manual. Fortaleza a preservar en cualquier refactor.

**RECOMENDACIÓN:** Ninguna; mantener este comportamiento como invariante de regresión en Bloque A.

---

## 1.5 Usabilidad, accesibilidad y rendimiento (D3)

### Lighthouse (medido con Chromium headless sobre servidor local replicando la estructura de GitHub Pages — raíz del repo)

| Categoría | Escritorio | Móvil |
|---|---|---|
| Performance | 100 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 96 | 96 |
| SEO | 100 | 100 |

### H-009 — Best Practices 96/100 por error de consola [BAJA, D3]

**DATO:** El único audit no perfecto es `errors-in-console`, causado por una petición fallida a `favicon.ico` (404 Not Found) — no existe fichero de favicon en el repositorio.

**INTERPRETACIÓN:** Es el único elemento que impide el 100/100 en Best Practices, y corresponde exactamente al criterio C7 (partir de una puntuación base y no bajarla).

**RECOMENDACIÓN:** Añadir un favicon (SVG o ICO mínimo). Candidata a Bloque A, riesgo nulo.

### axe-core (reglas WCAG 2.0/2.1/2.2 A y AA)

### H-026 — 0 violaciones detectadas [Positivo, D3]

**DATO:** Ejecución de axe-core 4.12.1 vía Playwright/Chromium sobre dos estados del DOM: (a) formulario vacío recién cargado, (b) las 23 variables rellenadas con la opción de mayor puntuación (para forzar la aparición de todos los estados visuales, incluida la banda de prioridad 1 en rojo). En ambos casos: `violations.length === 0`.

**INTERPRETACIÓN:** No se han detectado errores críticos, moderados ni menores de accesibilidad automatizada en ninguno de los dos estados probados. Coherente con el uso de HTML semántico nativo (`label`, `fieldset`/`legend`, `table`, `aria-label` en los `select`) y con estilos de foco visibles ya presentes en `style.css`.

**RECOMENDACIÓN:** Ninguna acción correctiva. Mantener estas prácticas como línea base de no regresión en Bloque A (C8).

### H-008 — Overflow horizontal real en móvil [**ALTA**, D3]

**DATO:** Medido con Playwright/Chromium a 375×812 px (breakpoint móvil estándar): `document.documentElement.scrollWidth = 403` frente a `clientWidth = 375` (28 px de desbordamiento horizontal). Inspección de `getBoundingClientRect()`/`scrollWidth` de todos los elementos identifica como causa la `<table>` de "Contribuciones" (sección 3), que no está envuelta en un contenedor con `overflow-x` propio y cuyas celdas de texto largo (nombres de variable) fuerzan un ancho mayor que el viewport. A 768 px (tablet) y 1440 px (escritorio) no se detecta overflow.

**INTERPRETACIÓN:** Defecto real de responsive design, no hipotético — incumple directamente el criterio de aceptación C9 del encargo ("sin scroll horizontal... en móvil").

**RECOMENDACIÓN:** Envolver la tabla en un contenedor con `overflow-x: auto` (o adoptar un layout de tarjeta en móvil), sin cambiar ningún contenido. Cambio puramente de CSS, sin tocar datos ni lógica clínica. Candidata a Bloque A, prioritaria. Se detallará en `PLAN_MEJORAS.md`.

### H-010 — Comportamiento sin JavaScript [MEDIA, D3]

**DATO:** Una petición HTTP directa al documento servido (`curl http://localhost:8080/`, réplica de la estructura de despliegue) devuelve únicamente `<head>` con `title`/`meta`/`link`/`script` y un `<main id="app"></main>` vacío. No existe ninguna etiqueta `<noscript>` ni en `index.html` raíz ni en `cmo-migrana-app/index.html`.

**INTERPRETACIÓN:** Un usuario con JavaScript deshabilitado, o cuyo navegador bloquee el módulo por cualquier motivo, recibe una página completamente en blanco sin ningún mensaje explicativo.

**RECOMENDACIÓN:** Añadir un `<noscript>` con un mensaje mínimo ("Esta herramienta requiere JavaScript habilitado para funcionar"). Cambio técnico de bajo riesgo. Candidata a Bloque A.

### H-011 — Meta-etiquetas incompletas en el HTML servido [MEDIA, D3 — relacionado con §5.b]

**DATO:** El HTML inicial (no inyectado por JS) contiene `charset`, `viewport`, `title`, `meta description` y `link rel="canonical"`, pero **no** contiene `meta name="author"`, `meta property="og:title"` ni `meta property="og:description"`.

**INTERPRETACIÓN:** Afecta tanto a D3 (SEO/compartición social) como al requisito explícito de atribución §5.b, que exige estas etiquetas en el HTML estático (no solo inyectadas por JS).

**RECOMENDACIÓN:** Añadir las meta-etiquetas exigidas en los tres HTML (raíz `index.html`, `404.html`, `cmo-migrana-app/index.html`), coherente con el script `build-pages.mjs` que ya genera duplicados. Candidata a Bloque A; se ejecutará en Fase 4 (atribución) junto con H-013/H-017.

### H-012 — Primera mención de "CMO" sin desarrollar la sigla en la interfaz [BAJA, D3]

**DATO:** La cabecera de la aplicación (`main.js`) dice literalmente "Herramienta CMO de estratificación para pacientes con migraña", sin desarrollar la sigla en ningún punto de la interfaz (coherente con H-001: no hay ninguna mención a "Capacidad", "Motivación" u "Oportunidad" en el código).

**INTERPRETACIÓN:** Incumple la regla terminológica transversal del encargo (usar "Capacidad–Motivación–Oportunidad (CMO)" en la primera mención) y el propio criterio de auditoría 1.5 sobre inconsistencias terminológicas.

**RECOMENDACIÓN:** Cambio de texto puro (no clínico): desarrollar la sigla en la primera mención dentro de la interfaz. Ligado a la creación de la sección "Acerca de" (H-013). Candidata a Bloque A.

### Responsive (tablet/escritorio) y comprobación general

**DATO:** A 768 px y 1440 px no se detecta overflow horizontal ni solapes visibles en la inspección automatizada. El CSS incluye una media query `@media (max-width: 700px)` (botones a ancho completo) y una `@media print` (oculta controles interactivos en impresión) y respeta `prefers-reduced-motion`.

**INTERPRETACIÓN:** El diseño responsive es correcto salvo por el caso concreto de la tabla (H-008).

### Español clínico

**DATO:** No se han detectado erratas ortográficas ni anglicismos innecesarios en el texto revisado. La inconsistencia terminológica detectada es la de H-012 (sigla "CMO" sin desarrollar).

---

## 1.6 Seguridad y datos (§5.a)

Verificación punto por punto, tal como exige el encargo:

| Requisito del encargo | Estado verificado | Hallazgo |
|---|---|---|
| Todo procesamiento ocurre localmente, sin envío a servidor externo | **Cumple.** `grep` de `http://`, `https://`, `fetch(`, `XMLHttpRequest`, `analytics`, `gtag`, `sentry` sobre todo el código fuente → 0 resultados (aparte del propio `<link rel="canonical">`, que es declarativo, no una petición). Cero dependencias npm. | H-025 (positivo) |
| No hay persistencia de identificadores directos | **Cumple parcialmente.** El código no almacena campos estructurados de nombre/NHC/DNI/fecha de nacimiento completa — solo `answers` (respuestas del formulario) y un campo de texto libre `pseudonym`. | Ver H-015 |
| Persistencia limitada a la sesión activa | **No cumple literalmente.** Se usa `localStorage` (persistente hasta borrado manual, sobrevive a cerrar el navegador), no `sessionStorage`. | H-014 |
| Botón visible de "borrar sesión"/borrar todo | **Cumple.** Existen botones "Borrar caso" (individual) y "Borrar todos los datos" (`localStorage.removeItem`), con confirmación previa. | — |
| Exportable sin identificadores directos por defecto | **Cumple por diseño** (el modelo de datos no incluye campos de identificación directa más allá del pseudónimo libre), pero sin advertencia activa. | H-015, H-016 |
| Aviso en el momento de exportar si se admiten identificadores | **No cumple.** Los botones de exportación (JSON/CSV/informe) descargan directamente sin ningún aviso previo. | H-016 |

### H-014 — Persistencia en `localStorage`, no limitada a la sesión activa [ALTA, seguridad]

**DATO:** `main.js` usa `localStorage.getItem/setItem` con clave fija `cmo_migrana_cases_v1`. Los casos guardados persisten entre cierres y reinicios del navegador hasta que el usuario borre manualmente.

**INTERPRETACIÓN:** El requisito del encargo pide explícitamente que el almacenamiento "se limite a la sesión activa". `localStorage` no cumple esto por diseño (a diferencia de `sessionStorage`, que se borra automáticamente al cerrar la pestaña/navegador). Existe mitigación parcial (botones de borrado visibles), pero el mecanismo de fondo no coincide con el requisito literal.

**RECOMENDACIÓN:** Presentar como decisión con dos opciones y sus riesgos (no elegir unilateralmente, dado que afecta a un requisito de protección de datos):
- (a) Migrar a `sessionStorage`: cumple literalmente el requisito, pero el farmacéutico pierde los casos guardados al cerrar la pestaña (puede no ser deseable en la práctica clínica real).
- (b) Mantener `localStorage` pero documentar el riesgo y reforzar el botón de borrado (p. ej. recordatorio visible de "borrar al terminar la consulta").
Se detallará en `PLAN_MEJORAS.md` como ítem de decisión explícita (Bloque A técnico, pero con implicación de protección de datos que amerita su visto bueno).

### H-015 — Campo de pseudónimo sin advertencia in-situ [MEDIA, seguridad]

**DATO:** El campo `<input id="pseudo">` es de texto libre, sin `pattern`, sin límite de longitud restrictivo y sin ningún texto de ayuda visible junto al campo. `PRIVACY.md` advierte por escrito "No deben introducirse identificadores directos reales", pero esa advertencia no está en la propia pantalla del formulario.

**INTERPRETACIÓN:** El riesgo de que un usuario introduzca un nombre real, DNI o NHC en este campo es real y no está mitigado por ninguna señal en el momento de la introducción de datos.

**RECOMENDACIÓN:** Añadir un texto de ayuda visible junto al campo (no bloquear ni validar contenido, para evitar falsos positivos o fricción). Candidata a Bloque A.

### H-016 — Exportaciones sin advertencia en el momento de exportar [MEDIA, seguridad]

**DATO:** `$('#json').onclick`, `$('#csv').onclick`, `$('#report').onclick` descargan el fichero directamente, sin ningún diálogo ni texto de advertencia previo.

**INTERPRETACIÓN:** Incumple literalmente el requisito del encargo: "si los admite (p. ej. iniciales, código interno), debe advertirse al usuario en el momento de la exportación."

**RECOMENDACIÓN:** Añadir un aviso visible en el momento de exportar (recordatorio, no bloqueo). Candidata a Bloque A, sin tocar el contenido clínico del informe.

### H-025 — Cero llamadas de red externas y cero dependencias npm [Positivo, seguridad]

**DATO:** Ver tabla anterior. `package.json` no declara ninguna dependencia.

**INTERPRETACIÓN:** Cumple el requisito central de protección de datos (T8): ningún dato de paciente puede salir del navegador porque no existe ningún canal de red en el código. Cero superficie de vulnerabilidades de cadena de suministro.

**RECOMENDACIÓN:** Mantener como invariante: cualquier cambio de Bloque A debe justificar explícitamente cualquier nueva dependencia o llamada de red (no se prevé necesitar ninguna).

---

## 1.7 Autoría, versionado, licencia

### H-013 — No existe sección "Acerca de / Metodología" ni mención a MAPEX/SEFH/autoría en la app [**CRÍTICA** (estructural), D1/D4/atribución]

**DATO:** `grep -rniE "MAPEX|SEFH|Ramón Morillo|Morillo-Verdugo|Acerca de|Metodología"` sobre todo el repositorio (excluyendo `dist/`) → 0 resultados. La interfaz (`main.js`) solo tiene 4 secciones: "1. Crear o recuperar caso", "2. Formulario por dimensiones", "3. Resumen y resultado", "4. Guardado, exportación...".

**INTERPRETACIÓN:** No es solo un vacío de atribución (ya previsto y encargado en §5.b), sino un vacío estructural: no existe ningún punto de anclaje en la interfaz donde insertar el bloque "Base metodológica" ni el marcador `<!-- METHODOLOGY_REF_PLACEHOLDER v1 -->`. Habrá que crear la sección desde cero.

**RECOMENDACIÓN:** Crear una sección "Acerca de / Metodología" con los textos ya literalmente especificados por el propio encargo (footer de atribución, bloque de base metodológica, marcador placeholder). Como el texto exacto ya lo ha proporcionado usted en el encargo, no requiere una nueva aprobación clínica — se ejecutará en Fase 3/4 tras la aprobación técnica en bloque de Fase 2.

### H-017 — Ausencia total de atribución de autoría [ALTA, atribución]

**DATO:** No hay ninguna mención al autor en footer, README, `package.json` (sin campo `author`), `CHANGELOG.md`, metadatos HTML, ni informe exportable.

**INTERPRETACIÓN:** Coherente con que la herramienta se creó en julio de 2026 y esta es la primera auditoría formal; es un pendiente explícito del propio encargo (§5.b), no un error.

**RECOMENDACIÓN:** Implementar en Fase 4 conforme a §5.b, en los 8 puntos ahí listados.

### H-018 — No existe fichero `LICENSE` [BAJA, licencia]

**DATO:** No hay `LICENSE`, `LICENSE.md` ni mención de licencia en ningún fichero del repositorio.

**INTERPRETACIÓN:** Sin licencia explícita, el código queda bajo copyright por defecto ("todos los derechos reservados"), lo que puede no ser la intención si se busca que otros farmacéuticos hospitalarios adopten la herramienta como referencia.

**RECOMENDACIÓN:** Conforme a la regla del encargo, no se aplica ninguna licencia sin aprobación. Se propondrá una opción (sin aplicarla) en `PLAN_MEJORAS.md`.

### H-019 — `CHANGELOG.md` no usa el texto literal exigido [BAJA, versionado]

**DATO:** La entrada actual dice "## 1.0.0 - 2026-07-21 / Aplicación inicial CMO-Migraña independiente. / Motor de cálculo determinista...", sin autoría ni el texto exacto exigido por el criterio C10: *"v1.0.0 — Julio 2026 — Autor: Ramón Morillo-Verdugo. Herramienta inicial de estratificación Capacidad–Motivación–Oportunidad en migraña."*

**INTERPRETACIÓN:** Debe completarse en Fase 4 (atribución), preservando la información técnica ya existente.

**RECOMENDACIÓN:** Añadir la entrada exigida literalmente, sin eliminar la entrada técnica actual. Bloque A.

---

## Hallazgos técnicos adicionales

### H-020 — `TEST_PLAN.md` menciona "Vitest" incorrectamente [BAJA, técnico]

**DATO:** `TEST_PLAN.md` dice "La suite Vitest cubre...", pero el proyecto usa el test runner nativo de Node (`node --test`, ver `package.json`); no hay dependencia `vitest` en ningún lugar.

**INTERPRETACIÓN:** Error de documentación heredado (posiblemente de una plantilla genérica); no afecta al comportamiento, pero puede confundir a quien audite o contribuya al proyecto.

**RECOMENDACIÓN:** Corregir la mención. Bloque A, cambio puramente documental.

### H-021 — Código fuente en una única línea por fichero [BAJA, técnico/mantenibilidad]

**DATO:** `core.mjs` (7 líneas totales para toda la lógica) y `main.js` (esencialmente una sola línea) no están formateados con saltos de línea legibles.

**INTERPRETACIÓN:** No afecta al comportamiento ni a los resultados, pero reduce la auditabilidad práctica del código — objetivo explícito de este encargo (D1, D4) — y dificulta el control de versiones línea a línea en cambios futuros.

**RECOMENDACIÓN:** Reformatear con una herramienta ya disponible en el entorno (Prettier), preservando exactamente el comportamiento (mismo AST, solo espacios en blanco), con test de regresión que confirme resultados idénticos antes/después. Bloque A.

### H-022 — Sin CI/GitHub Actions [BAJA, técnico]

**DATO:** No existe `.github/`. El despliegue a GitHub Pages requiere ejecutar `npm run build:pages` manualmente y commitear los ficheros generados en la raíz.

**INTERPRETACIÓN:** Riesgo de desincronización entre `cmo-migrana-app/src` y los ficheros raíz si se edita uno sin regenerar el otro (en el momento de esta auditoría están sincronizados).

**RECOMENDACIÓN:** Añadir un workflow que ejecute tests + build y verifique (o publique) automáticamente. Bloque A, nueva infraestructura (no dependencia de producción) — se justificará en el plan.

### H-023 — Uso de diálogos nativos del navegador (`prompt`/`alert`/`confirm`) [BAJA, técnico/UX]

**DATO:** El override clínico, la importación de JSON y el borrado de casos usan `prompt()`, `alert()` y `confirm()` nativos.

**INTERPRETACIÓN:** Son accesibles pero visualmente pobres, no estilizables y con comportamiento variable en navegadores móviles. No se ha detectado que generen violaciones de axe-core, pero es una limitación de UX para uso en consulta clínica.

**RECOMENDACIÓN:** Sustituir por un formulario/modal in-page accesible, manteniendo exactamente los mismos campos y la obligatoriedad de justificación. Cambio de interfaz puro. Bloque A.

### H-024 — `src/main.js` sin cobertura de tests [BAJA, técnico]

**DATO:** `node --experimental-test-coverage --test` reporta cobertura únicamente para `core.mjs` (100 % líneas / 93,3 % ramas / 97,1 % funciones) y `test/scoring.test.mjs`; `main.js` no aparece en el informe porque ningún test lo ejecuta.

**INTERPRETACIÓN:** La parte más crítica clínicamente (el algoritmo de puntuación) está muy bien cubierta. La capa de interfaz (renderizado, guardado, exportación, override) no tiene ninguna prueba automatizada.

**RECOMENDACIÓN:** Añadir pruebas ligeras de interfaz (Playwright, ya disponible en el entorno de desarrollo, sin necesidad de nueva dependencia de producción) para los flujos de guardar/exportar/borrar/override. Bloque A.

### H-028 — Cobertura de `core.mjs`: 100 % líneas, 93,3 % ramas, 97,1 % funciones [Positivo, D1/D2]

**DATO:** Ver H-024. Los 10 tests existentes cubren: máximos por dimensión y total, umbrales de prioridad, prioridad automática (embarazo/lactancia/deseo gestacional), derivación pediátrica, datos ausentes, override, intervenciones acumulativas, exclusión de conceptos prohibidos, importación/exportación e informe imprimible.

**INTERPRETACIÓN:** Buena base de regresión ya existente sobre la que construir cualquier cambio de Bloque A sin alterar resultados.

**RECOMENDACIÓN:** Mantener y ampliar (H-024) sin modificar los tests existentes salvo que cambien de nombre variables (no previsto).

---

## Cierre de Fase 1

Este documento no ha modificado ningún fichero de código, configuración ni contenido clínico del repositorio — es una auditoría de solo lectura. Los hallazgos H-001, H-002 y H-013 (críticos) requieren una decisión suya antes de poder redactar un `PLAN_MEJORAS.md` bien fundamentado en la parte de D1, aunque el resto de hallazgos (D2 parcial, D3, D4, seguridad, atribución, técnico) ya tienen recomendaciones claras de Bloque A/B.

**Quedo a la espera de su aprobación explícita para pasar a la Fase 2 (`PLAN_MEJORAS.md`).** Antes de eso, le pediría específicamente su posición sobre H-001/H-002 (mapeo C/M/O) y H-014 (localStorage vs sessionStorage), ya que condicionan cómo se clasifican y priorizan varios ítems del plan.
