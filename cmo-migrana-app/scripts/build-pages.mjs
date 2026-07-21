import { readFile, writeFile } from 'node:fs/promises';
import './build.mjs';

const page = await readFile('dist/index.html', 'utf8');
const githubPagesPage = page
  .replaceAll('href="src/', 'href="cmo-migrana-app/src/')
  .replaceAll('src="src/', 'src="cmo-migrana-app/src/')
  .replace(
    '<title>CMO-Migraña</title>',
    '<title>CMO-Migraña</title><meta name="description" content="Herramienta local de apoyo a la estratificación farmacéutica de pacientes con migraña."><link rel="canonical" href="https://ramonmorillo.github.io/estratificacionmigrana/">',
  );

await writeFile('../index.html', githubPagesPage);
await writeFile('../404.html', githubPagesPage);
console.log('GitHub Pages root listo');
