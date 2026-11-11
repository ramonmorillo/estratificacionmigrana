// Adaptador de CMO-Migraña (src/assessment.mjs). El motor y el analizador no se modifican.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { VARIABLES, THRESHOLDS, scoreCase, cumulativeInterventions } from '../src/core.mjs';
import * as A from '../src/assessment.mjs';
import { createReport, validateReport, reportToText, toCsv, exportEnvelope } from '../src/cmo-ds/cmo-report.js';
import { reportToPdf } from '../src/cmo-ds/cmo-pdf.js';

const base = (extra = {}) => ({ id: 'caso-1', pseudonym: 'MIG-0001', hospital: 'Hospital Ficticio', pharmacist: 'Farmacéutica Ficticia', answers: {}, statuses: {}, plan: { nextReview: '', notes: '' }, ...extra });
let seed = 3; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const randomAnswers = (p = 1) => Object.fromEntries(VARIABLES.filter(() => rnd() < p).map(v => [v.id, v.options[Math.floor(rnd() * v.options.length)].id]));
const complete = (v) => ({ ...Object.fromEntries(VARIABLES.map(x => [x.id, x.options.find(o => o.score === 0 && !o.pediatricReferral && !o.automaticPriorityReason)?.id || x.options[0].id])), ...v });
function findTotal(n) {
  for (let i = 0; i < 40000; i++) { const a = randomAnswers(1); const r = scoreCase(a); if (r.total === n && !r.pediatric && !r.automaticPriority) return a; }
  throw new Error(`sin caso con total ${n}`);
}

test('el motor y el analizador no se han modificado (huellas de la versión 2.1.0)', () => {
  const expected = JSON.parse(fs.readFileSync(new URL('./fixtures/clinical.sha256.json', import.meta.url), 'utf8'));
  for (const [file, hash] of Object.entries(expected)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(`../src/${file}`, import.meta.url))).digest('hex'), hash, file);
});

test('fronteras 14/15 y 18/19 por el flujo nuevo: mismo resultado que el motor', () => {
  for (const [n, p] of [[14, 3], [15, 2], [18, 2], [19, 1]]) {
    const a = findTotal(n), ev = A.evaluate({ answers: a });
    assert.equal(ev.result.total, n); assert.equal(ev.result.finalPriority, p); assert.equal(ev.provisional, false);
    assert.deepEqual(ev.result, scoreCase(a));
  }
  assert.equal(THRESHOLDS.p1Min, 19); assert.equal(THRESHOLDS.p2Min, 15);
});

test('paridad en 300 casos pseudoaleatorios (puntos, prioridad, pendientes)', () => {
  for (let i = 0; i < 300; i++) {
    const a = randomAnswers(0.8), ev = A.evaluate({ answers: a }), d = scoreCase(a);
    assert.equal(ev.result.total, d.total); assert.equal(ev.result.finalPriority, d.finalPriority); assert.deepEqual(ev.result.missing, d.missing);
    assert.equal(ev.provisional, d.missing.length > 0); assert.ok(ev.maxPossible.total >= d.total);
  }
});

test('pendiente no es «No»: sin datos es provisional con cota superior y prioridad automática posible', () => {
  const ev = A.evaluate({ answers: {} });
  assert.equal(ev.provisional, true); assert.equal(ev.result.missing.length, VARIABLES.filter(v => v.required).length);
  assert.equal(ev.maxPossible.automaticPossible, true); assert.equal(ev.maxPossible.priority, 1); assert.equal(ev.priorityMayChange, true);
  const text = reportToText(createReport(A.buildReportInput(base(), ev)));
  assert.match(text, /\(PROVISIONAL\)/); assert.match(text, /no se ha considerado negativa/); assert.match(text, /cota|podría alcanzar/);
});

test('menor de 18 años: el informe no presenta una prioridad de adultos', () => {
  const ev = A.evaluate({ answers: complete({ edad: 'menor_18' }) });
  assert.equal(ev.applicable, false);
  const report = createReport(A.buildReportInput(base(), ev));
  assert.equal(report.status, 'provisional'); assert.match(report.stratification.finalLevel, /No aplicable/);
  assert.match(reportToText(report), /modelo CMO pediátrico/);
});

test('modificación manual: exige justificación, conserva lo calculado y avisa si rebaja una prioridad automática', () => {
  const auto = complete({ situacion_reproductiva: 'si' });
  let ev = A.evaluate({ answers: auto, override: { from: 1, to: 3, justification: 'corta' } });
  assert.equal(ev.result.finalPriority, 1); assert.equal(ev.overrideNotApplied, true);
  ev = A.evaluate({ answers: auto, override: { from: 1, to: 3, justification: 'Justificación clínica documentada', reinforcedWarningAccepted: true } });
  assert.equal(ev.result.finalPriority, 3); assert.equal(ev.result.algorithmPriority, 1); assert.equal(ev.overrideLowersAutomatic, true);
  const text = reportToText(createReport(A.buildReportInput(base({ answers: auto }), ev)));
  assert.match(text, /Resultado calculado por el modelo: Prioridad 1/); assert.match(text, /Modificación por criterio profesional: Prioridad 3/); assert.match(text, /disminuye una prioridad automática/);
  assert.equal(A.cleanOverride({ to: 9, justification: 'x'.repeat(30) }), undefined);
});

test('actuaciones: el catálogo es exactamente cumulativeInterventions() con identificadores únicos', () => {
  for (const p of [1, 2, 3]) { const c = A.interventionCatalog(p); assert.deepEqual(c.map(i => i.label), cumulativeInterventions(p).map(i => i.text)); assert.equal(new Set(c.map(i => i.id)).size, c.length); }
});

test('informe: cada variable que puntúa aparece una vez; estados, plan y PDF', () => {
  const answers = complete({ tipo_frecuencia_migrana: VARIABLES.find(v => v.id === 'tipo_frecuencia_migrana').options.at(-1).id });
  const ids = A.interventionCatalog(scoreCase(answers).finalPriority).map(i => i.id);
  const state = base({ answers, statuses: { [ids[0]]: 'done', [ids[1]]: 'planned' }, plan: { nextReview: '2027-02-10', notes: 'Llamada.' } });
  const ev = A.evaluate(state), report = createReport(A.buildReportInput(state, ev, { version: '2.2.0', date: '2026-11-11T10:00:00' }));
  assert.deepEqual(validateReport(report), []);
  assert.equal(report.factors.length + report.needs.confirmed.length, ev.result.contributions.filter(c => !c.missing && c.score > 0).length);
  const text = reportToText(report);
  assert.match(text, /Realizadas en esta consulta:/); assert.match(text, /Próxima valoración prevista: 10\/02\/2027/);
  assert.ok(Buffer.from(reportToPdf(report)).toString('latin1').includes('MIG-0001'));
});

test('importación hostil y formato anterior: saneada y recalculada', () => {
  const evil = { schema: 'cmo-export/1', app: { id: 'cmo-migrana' }, dataSchema: 'cmo-mig-case/1', data: { schema: 'cmo-mig-case/1', id: '<x>', pseudonym: '<img src=x onerror=1>', answers: { edad: 'banana', sexo: 'femenino', inventada: 'si' }, override: { to: 9, justification: 'x' }, statuses: { zzz: 'done' }, result: { finalPriority: 3 } } };
  const r = A.importAny(JSON.stringify(evil));
  assert.equal(r.ok, true); assert.deepEqual(r.state.answers, { sexo: 'femenino' }); assert.equal(r.state.override, undefined); assert.deepEqual(r.state.statuses, {}); assert.equal(r.state.id, '');
  assert.equal(A.importAny(JSON.stringify({ ...evil, app: { id: 'otra' } })).ok, false); assert.equal(A.importAny('no json').ok, false);
  const old = A.importAny(JSON.stringify({ id: 'abc', pseudonym: 'P', answers: { comorbilidades_cardiovasculares: 'si', sexo: 'femenino' }, override: { from: 3, to: 1, justification: 'Justificación clínica documentada' }, result: { total: 99 } }));
  assert.equal(old.ok, true); assert.equal(old.legacy, true); assert.equal(old.state.answers.sexo, 'femenino'); assert.equal(A.evaluate(old.state).result.total, scoreCase(old.state.answers).total);
});

test('CSV: fórmulas neutralizadas', () => {
  const state = base({ pseudonym: '=HYPERLINK("x")' });
  assert.ok(toCsv(A.csvRows(state, A.evaluate(state))).includes(`"'=HYPERLINK(""x"")"`));
  assert.equal(exportEnvelope({ app: { id: A.APP_ID }, data: {} }).schema, 'cmo-export/1');
});

test('la aplicación no contiene red ni claves de API', () => {
  for (const f of ['main.js', 'assessment.mjs']) assert.doesNotMatch(fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8'), /\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//, f);
});
