// Recorrido extremo a extremo de CMO-Migraña en Chromium (Playwright). Datos ficticios.
//   npm run test:e2e            (requiere Playwright con Chromium)
//   AXE_PATH=<axe.min.js>       añade la auditoría WCAG A/AA
//   E2E_OUT=<carpeta>           guarda PDF, texto y capturas
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {VARIABLES, scoreCase} from '../../src/core.mjs';
import * as A from '../../src/assessment.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); } catch { try { ({chromium} = await import('playwright')); } catch { chromium = null; } }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.env.E2E_OUT;
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json'};
let server, browser, origin;
const external = [];
let promptText = 'Justificación clínica ficticia suficientemente larga';

before(async () => {
  if (!chromium) return;
  server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    if (file.endsWith(path.sep)) file += 'index.html';
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream'}); res.end(data); });
  });
  await new Promise(r => server.listen(0, r));
  origin = `http://localhost:${server.address().port}/`;
  browser = await chromium.launch();
  if (OUT) fs.mkdirSync(OUT, {recursive: true});
});
after(async () => { await browser?.close(); server?.close(); });

async function open(viewport = {width: 1280, height: 900}) {
  const context = await browser.newContext({viewport, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write']});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => (d.type() === 'prompt' ? d.accept(promptText) : d.accept()));
  page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'about:srcdoc') external.push(u); });
  await page.goto(origin);
  await page.waitForSelector('#pseudo');
  return {page, errors};
}
const set = (page, id, value) => page.selectOption(`select[data-var="${id}"]`, value);
const identify = async page => { await page.fill('#pseudo', 'MIG-0001'); await page.fill('#hospital', 'Hospital Ficticio'); await page.fill('#pharmacist', 'Farmacéutica Ficticia'); };
// Primera opción sin puntos, sin prioridad automática ni derivación pediátrica.
const neutral = id => VARIABLES.find(v => v.id === id).options.find(o => o.score === 0 && !o.pediatricReferral && !o.automaticPriorityReason)?.id;
async function fillAll(page, over = {}) { for (const v of VARIABLES) await set(page, v.id, over[v.id] ?? neutral(v.id) ?? v.options[0].id); }
const save = async (download, name) => { const file = path.join(OUT || fs.mkdtempSync('/tmp/cmo-mig-'), name); await download.saveAs(file); return file; };
async function axe(page, label) {
  if (!process.env.AXE_PATH) return;
  await page.evaluate(() => { const t = document.querySelector('.cmo-toast'); if (t) t.hidden = true; });
  await page.addScriptTag({path: process.env.AXE_PATH});
  const violations = await page.evaluate(async () => (await window.axe.run(document, {preload: false, runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']})).violations.map(v => `${v.id}(${v.nodes.length}): ${v.nodes.map(n => n.html.slice(0, 90)).join(' | ')}`));
  assert.deepEqual(violations, [], `axe ${label}`);
}
const skip = {skip: !chromium && 'Playwright no disponible'};
const confirmButton = (page, label) => page.click(`dialog.cmo-modal button:has-text("${label}")`);

test('recorrido completo: provisional → completo, actuaciones, plan, informe, exportación e importación', skip, async () => {
  const {page, errors} = await open();
  await axe(page, 'inicio');
  assert.match(await page.textContent('.alert'), /Resultado provisional:/);
  assert.match(await page.textContent('.alert'), /podría alcanzar \d+ puntos/);
  await identify(page);
  await fillAll(page);
  assert.equal(await page.locator('.alert:has-text("Resultado provisional")').count(), 0, 'completo: ya no es provisional');
  await axe(page, 'caso completo');
  // Actuaciones con estado y plan
  const total = A.interventionCatalog(scoreCase(Object.fromEntries(VARIABLES.map(v => [v.id, neutral(v.id) ?? v.options[0].id]))).finalPriority).length;
  assert.equal(await page.locator('select[data-int]').count(), total);
  await page.selectOption('select[data-int] >> nth=0', 'done');
  await page.selectOption('select[data-int] >> nth=1', 'planned');
  await page.fill('#nextReview', '2027-02-10');
  await page.fill('#planNotes', '<img src=x onerror="window.__xss=1"> Llamada de seguimiento.'); await page.locator('#planNotes').blur();
  await axe(page, 'seguimiento');
  // Informes
  await page.click('#copy');
  await page.waitForFunction(() => document.getElementById('copyStatus').textContent !== '');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(text, /Identificador del paciente \(seudonimizado\): MIG-0001/); assert.match(text, /Realizadas en esta consulta:\n\s+- [^\n]+/); assert.match(text, /Planificadas \/ pendientes:/);
  assert.match(text, /Próxima valoración prevista: 10\/02\/2027/); assert.match(text, /RESULTADO DE ESTRATIFICACIÓN: PRIORIDAD \d$/m);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.click('#pdf')]);
  const bytes = fs.readFileSync(await save(pdf, 'informe-ficticio.pdf'));
  assert.equal(bytes.subarray(0, 8).toString('latin1'), '%PDF-1.4'); assert.ok(bytes.toString('latin1').includes('MIG-0001'));
  const [txt] = await Promise.all([page.waitForEvent('download'), page.click('#report')]);
  assert.equal(fs.readFileSync(await save(txt, 'informe-ficticio.txt'), 'utf8'), text, 'el .txt es idéntico al texto copiado');
  const printed = page.evaluate(() => new Promise(r => document.addEventListener('cmo:print', () => r(document.querySelector('iframe.cmo-print-frame').contentDocument.body.textContent), {once: true})));
  await page.click('#print');
  assert.ok((await printed).includes('Resultado de estratificación'));
  const [json] = await Promise.all([page.waitForEvent('download'), page.click('#json')]);
  const jsonFile = await save(json, 'caso-ficticio.json');
  const env = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  assert.equal(env.schema, 'cmo-export/1'); assert.equal(env.dataSchema, 'cmo-mig-case/1'); assert.equal(env.app.id, 'cmo-migrana');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#csv')]);
  assert.match(fs.readFileSync(await save(csv, 'caso-ficticio.csv'), 'utf8'), /"prioridad_final";/);
  // Importación hostil y de formato anterior, con recálculo
  const dir = path.dirname(jsonFile);
  const evil = JSON.parse(JSON.stringify(env)); evil.data.pseudonym = '<img src=x onerror="window.__xss=1">'; evil.data.answers.edad = 'banana'; evil.data.override = {to: 9, justification: 'x'}; evil.data.statuses = {zzz: 'done'}; evil.report = null;
  fs.writeFileSync(path.join(dir, 'hostil.json'), JSON.stringify(evil));
  await page.setInputFiles('#importFile', path.join(dir, 'hostil.json'));
  await confirmButton(page, 'Importar y sustituir');
  await page.waitForFunction(() => /importado y recalculado/.test(document.querySelector('.cmo-toast')?.textContent || ''));
  assert.equal(await page.evaluate(() => window.__xss), undefined); assert.equal(await page.locator('img[src="x"]').count(), 0);
  assert.equal(await page.inputValue('select[data-var="edad"]'), '', 'valor fuera del modelo descartado');
  fs.writeFileSync(path.join(dir, 'malo.json'), '{"schema":"otro"}');
  await page.setInputFiles('#importFile', path.join(dir, 'malo.json'));
  await page.waitForFunction(() => /No se ha podido importar/.test(document.querySelector('.cmo-toast')?.textContent || ''));
  fs.writeFileSync(path.join(dir, 'antiguo.json'), JSON.stringify({id: 'viejo-1', pseudonym: 'VIEJO', answers: {sexo: 'femenino'}, result: {finalPriority: 1}}));
  await page.setInputFiles('#importFile', path.join(dir, 'antiguo.json'));
  await confirmButton(page, 'Importar y sustituir');
  await page.waitForFunction(() => /formato anterior/.test(document.querySelector('.cmo-toast')?.textContent || ''));
  assert.equal(await page.inputValue('#pseudo'), 'VIEJO');
  // Borrar el caso: no reaparece al teclear (antes se volvía a guardar)
  await page.click('#del'); await confirmButton(page, 'Borrar');
  await page.waitForFunction(() => /Caso borrado/.test(document.querySelector('.cmo-toast')?.textContent || ''));
  await page.fill('#hospital', 'H');
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('cmo_migrana_cases_v1') || '[]'))).filter(c => c.pseudonym === 'VIEJO').length, 0);
  assert.deepEqual(errors, []);
});

test('modificación manual de una prioridad automática: confirmación, justificación y aviso', skip, async () => {
  const {page, errors} = await open();
  await identify(page);
  await fillAll(page, {situacion_reproductiva: 'si'});
  assert.match(await page.textContent('.priority'), /Prioridad final: 1/);
  promptText = 'corta';
  await page.selectOption('#override', '3'); await confirmButton(page, 'Continuar');
  await page.waitForFunction(() => /no se ha aplicado/.test(document.querySelector('.cmo-toast')?.textContent || ''));
  assert.match(await page.textContent('.priority'), /Prioridad final: 1/);
  promptText = '<img src=x onerror="window.__xss=1"> Justificación clínica suficientemente larga';
  await page.selectOption('#override', '3'); await confirmButton(page, 'Continuar');
  await page.waitForFunction(() => document.querySelector('.priority')?.textContent.includes('Prioridad final: 3'));
  assert.match(await page.textContent('.panel:has(#override)'), /disminuye una prioridad automática/);
  assert.equal(await page.evaluate(() => window.__xss), undefined); assert.equal(await page.locator('img[src="x"]').count(), 0);
  await page.click('#copy');
  await page.waitForFunction(() => document.getElementById('copyStatus').textContent !== '');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(text, /Modificación por criterio profesional: Prioridad 3/); assert.match(text, /Resultado calculado por el modelo: Prioridad 1/);
  promptText = 'Justificación clínica ficticia suficientemente larga';
  assert.deepEqual(errors, []);
});

test('menor de 18 años: no se presenta una prioridad de adultos', skip, async () => {
  const {page, errors} = await open();
  await identify(page); await fillAll(page, {edad: 'menor_18'});
  assert.match(await page.textContent('.priority'), /no aplicable \(modelo pediátrico\)/);
  await page.click('#copy');
  await page.waitForFunction(() => document.getElementById('copyStatus').textContent !== '');
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /No aplicable \(modelo pediátrico\)/);
  assert.deepEqual(errors, []);
});

test('análisis de texto: nada puntúa hasta confirmar; el texto no se guarda', skip, async () => {
  const {page, errors} = await open();
  await page.click('#preDetails > summary');
  await page.fill('#preText', 'Paciente embarazada. <img src=x onerror="window.__xss=1">');
  await page.click('#analyzeBtn');
  await page.waitForSelector('.pre-row');
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('select[data-var="situacion_reproductiva"]').inputValue(), '', 'analizar no rellena el cuestionario');
  await page.locator('[data-confirm]').first().click();
  assert.notEqual(await page.locator('select[data-var="situacion_reproductiva"]').inputValue(), '');
  assert.ok(!(await page.evaluate(() => JSON.stringify({...localStorage}))).includes('embarazada'), 'el texto pegado no se guarda');
  assert.deepEqual(errors, []);
});

test('móvil 375 px: sin desbordamiento horizontal', skip, async () => {
  const {page, errors} = await open({width: 375, height: 740});
  await identify(page); await fillAll(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 0, `desbordamiento ${overflow}px`);
  if (OUT) await page.screenshot({path: path.join(OUT, 'movil-375.png'), fullPage: true});
  assert.deepEqual(errors, []);
});

test('sin peticiones a terceros en todo el recorrido', skip, () => { assert.deepEqual(external, []); });
