# Sistema visual común de las herramientas CMO

`estratificacionmigrana` es la referencia estética de la familia de herramientas CMO.

## Rasgos comunes

- Fondo oscuro en degradado con retícula discreta.
- Cabecera protagonista con degradado propio de cada patología.
- Superficies clínicas claras, bordes suaves y radio amplio.
- Botones principales en formato píldora.
- Campos con radio uniforme y foco de alto contraste.
- Métricas y resultados presentados mediante tarjetas.
- Diseño adaptable y respeto de `prefers-reduced-motion`.

## Variación por patología

Cada aplicación conserva una paleta identificativa mediante los tokens `--cmo-accent`, `--cmo-accent-dark`, `--cmo-accent-soft`, `--cmo-bg-a` y `--cmo-bg-b`. La paleta puede variar, pero no la jerarquía visual, el tratamiento de componentes ni los estados clínicos P1/P2/P3.

## Límites

La capa visual no contiene puntuaciones, umbrales, variables clínicas ni reglas de extracción. Estas permanecen en los módulos propios de cada herramienta.
