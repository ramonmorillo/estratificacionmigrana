# Reglas clínicas implementadas

- Versión: `CMO-Migraña v1.0 — julio de 2026`.
- Dimensiones: demográficas, clínicas, farmacoterapéuticas y sociosanitarias.
- Máximos configurados por dimensión: 3, 10, 20 y 6; total de referencia 39 puntos. Tras consolidar comorbilidades cardiovasculares dentro de comorbilidades no psiquiátricas, la suma máxima efectiva calculada desde las opciones estructuradas es 38 puntos, sin modificar los umbrales de prioridad.
- Prioridad 1: total >= 19 o prioridad automática.
- Prioridad 2: 15-18 puntos.
- Prioridad 3: <= 14 puntos.
- Prioridad automática: embarazo, lactancia o deseo gestacional inminente; se muestra como “Sí — Prioridad 1”, no como puntuación numérica.
- Impacto y discapacidad: poco o ningún impacto (0), impacto moderado (1), impacto sustancial (2) e impacto severo (3).
- Comorbilidades no psiquiátricas: no (0), dolor crónico (1) o comorbilidades cardiovasculares (2). Si coexisten dolor crónico y comorbilidad cardiovascular se aplica la categoría de mayor puntuación.
- Menores de 18 años: estado “Requiere valoración mediante modelo pediátrico”.
- Los datos ausentes generan cálculo provisional y se listan como pendientes.

## Intervenciones excluidas

No se incorporan actuaciones con el concepto excluido por el encargo. Una prueba automatizada valida el catálogo.

## Ambigüedad documental

El PDF fuente no está en el repositorio. La configuración debe verificarse contra el documento original antes de implantación.
