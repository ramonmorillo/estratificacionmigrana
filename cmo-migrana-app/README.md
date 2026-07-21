# CMO-Migraña App

Herramienta web local de apoyo a la estratificación CMO para pacientes con migraña. La aplicación implementa un flujo privacy-first con formulario por dimensiones, cálculo trazable, override clínico, guardado local, importación/exportación e informe imprimible.

> Limitación crítica: en este repositorio no estaban disponibles `Output IV Taller CMO migraña_160726.pdf` ni el archivo comprimido de referencia técnica; por tanto, los textos literales y mapeos de página quedan marcados como pendientes de verificación documental antes de uso asistencial.

## Ejecutar

```bash
cd cmo-migrana-app
npm install
npm run dev
```

## Pruebas

```bash
npm test
npm run build
```

## GitHub Pages

```bash
npm run build
# publicar el contenido de dist/ en GitHub Pages o configurar Pages desde GitHub Actions
```
