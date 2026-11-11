// Adaptador de CMO-Migraña al informe único y al registro de actuaciones del núcleo CMO (src/cmo-ds/).
// No contiene reglas clínicas: el único motor es scoreCase() de core.mjs (sin cambios).
import { DIMENSIONS, THRESHOLDS, VARIABLES, MODEL_VERSION, cumulativeInterventions, normalizeAnswers, scoreCase, totalMaximum } from './core.mjs';
import { INTERVENTION_STATUSES, parseEnvelope } from './cmo-ds/cmo-report.js';

export const CASE_SCHEMA = 'cmo-mig-case/1';
export const APP_ID = 'cmo-migrana';
export const TOOL_NAME = 'SIAF-CMO Migraña';
export const MIN_JUSTIFICATION = 12;
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const optionIds = Object.fromEntries(VARIABLES.map(v => [v.id, new Set(v.options.map(o => o.id))]));
const PRIORITY_LABEL = p => `Prioridad ${p}`;

/** Respuestas saneadas: solo variables del modelo con opciones que el modelo define. */
export function cleanAnswers(raw) {
  const normalized = normalizeAnswers(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {});
  const out = {};
  for (const v of VARIABLES) if (typeof normalized[v.id] === 'string' && optionIds[v.id].has(normalized[v.id])) out[v.id] = normalized[v.id];
  return out;
}

/** La modificación manual solo tiene efecto con prioridad válida y justificación; el motor la recibe ya validada. */
export function cleanOverride(o) {
  if (!o || typeof o !== 'object') return undefined;
  const to = Number(o.to), from = Number(o.from);
  if (![1, 2, 3].includes(to)) return undefined;
  return { from: [1, 2, 3].includes(from) ? from : undefined, to, justification: str(o.justification, 2000), createdAt: str(o.createdAt, 40), reinforcedWarningAccepted: o.reinforcedWarningAccepted === true };
}

export const overrideValid = o => !!o && o.justification.length >= MIN_JUSTIFICATION;

export function evaluate(state) {
  const answers = cleanAnswers(state.answers);
  const requested = cleanOverride(state.override);
  const applied = requested && overrideValid(requested) ? requested : undefined;
  const base = scoreCase(answers);
  const result = scoreCase(answers, applied);
  const missingVars = VARIABLES.filter(v => result.missing.includes(v.id));
  const maxOf = v => Math.max(...v.options.map(o => (typeof o.score === 'number' ? o.score : 0)));
  const maxTotal = result.total + missingVars.reduce((n, v) => n + maxOf(v), 0);
  const autoPossible = !result.automaticPriority && missingVars.some(v => v.options.some(o => o.automaticPriorityReason));
  const numericMax = maxTotal >= THRESHOLDS.p1Min ? 1 : maxTotal >= THRESHOLDS.p2Min ? 2 : 3;
  const maxPriority = autoPossible || result.automaticPriority ? 1 : numericMax;
  return {
    answers, base, result, applicable: !result.pediatric, provisional: result.missing.length > 0, missingVars,
    maxPossible: { total: Math.min(maxTotal, totalMaximum()), priority: maxPriority, automaticPossible: autoPossible },
    priorityMayChange: maxPriority < result.algorithmPriority,
    overrideRequested: !!requested, overrideApplied: !!applied,
    overrideNotApplied: !!requested && !applied,
    overrideLowersAutomatic: !!applied && !!result.automaticPriority && applied.to > 1
  };
}

export const interventionCatalog = priority => cumulativeInterventions(priority).map(i => ({ id: `${i.priority}.${i.category}`, group: i.category, label: i.text, level: i.priority }));
export const interventionStatus = (state, id) => (Object.hasOwn(INTERVENTION_STATUSES, state.statuses?.[id]) ? state.statuses[id] : 'recommended');
export const needsByDimension = ev => Object.entries(DIMENSIONS).map(([key, dim]) => ({
  key, dim, confirmed: ev.result.contributions.filter(c => c.dimension === key && !c.missing && (c.score > 0 || c.automaticPriorityReason)),
  potential: ev.result.contributions.filter(c => c.dimension === key && c.missing)
}));

export function buildReportInput(state, ev, { version = '', date = '' } = {}) {
  const r = ev.result;
  const catalog = interventionCatalog(r.finalPriority);
  const by = s => catalog.filter(i => interventionStatus(state, i.id) === s).map(i => ({ group: i.group, label: i.label }));
  const warnings = [];
  if (!ev.applicable) warnings.push('Paciente menor de 18 años: requiere valoración mediante el modelo CMO pediátrico. La clasificación de adultos no es clínicamente válida.');
  if (ev.provisional) {
    warnings.push(`Resultado provisional: ${r.missing.length} variable(s) pendiente(s) de valoración. Una variable pendiente no se ha considerado negativa: no puntúa hasta que se valore.`);
    warnings.push(`Si las pendientes resultaran positivas, la puntuación podría alcanzar hasta ${ev.maxPossible.total} puntos${ev.priorityMayChange ? ` y la prioridad podría llegar a ${PRIORITY_LABEL(ev.maxPossible.priority)}` : '; la prioridad no cambiaría'}${ev.maxPossible.automaticPossible ? ' (una variable pendiente puede activar la prioridad automática)' : ''}.`);
  }
  if (ev.overrideLowersAutomatic) warnings.push('La modificación profesional disminuye una prioridad automática (regla del modelo): requiere justificación reforzada.');
  if (ev.overrideNotApplied) warnings.push(`Modificación no aplicada: la justificación debe tener al menos ${MIN_JUSTIFICATION} caracteres.`);
  const label = id => VARIABLES.find(v => v.id === id)?.label || id;
  return {
    title: 'Atención farmacéutica en migraña — Modelo CMO', tool: { name: TOOL_NAME, version },
    model: { name: MODEL_VERSION, version: '', source: `Basado en el modelo ${MODEL_VERSION}.` },
    evaluationDate: date, status: ev.provisional || !ev.applicable ? 'provisional' : 'final',
    hospital: state.hospital, pharmacist: state.pharmacist, patientId: state.pseudonym,
    stratification: {
      score: r.total, maxScore: THRESHOLDS.totalMax,
      subtotals: Object.entries(DIMENSIONS).map(([k, d]) => ({ label: d.label, points: r.subtotals[k], max: d.max })),
      calculatedLevel: ev.applicable ? PRIORITY_LABEL(r.algorithmPriority) : 'No aplicable (modelo pediátrico)', finalLevel: ev.applicable ? PRIORITY_LABEL(r.finalPriority) : 'No aplicable (modelo pediátrico)', levelCode: ev.applicable ? r.finalPriority : null,
      rules: r.automaticPriorityReasons.map(x => `Prioridad 1 automática: ${x}`),
      override: ev.overrideApplied ? { level: PRIORITY_LABEL(ev.result.override.to), motive: '', justification: ev.result.override.justification } : null,
      pending: r.missing.map(label)
    },
    factors: r.contributions.filter(c => !c.missing && c.score > 0 && c.dimension !== 'farmacoterapeuticas').map(c => ({ dimension: DIMENSIONS[c.dimension].label, label: c.variable, detail: c.option, points: c.score })),
    needs: {
      confirmed: r.contributions.filter(c => !c.missing && c.score > 0 && c.dimension === 'farmacoterapeuticas').map(c => ({ label: c.variable, detail: `${c.option} · ${c.score} p` })),
      potential: r.contributions.filter(c => c.missing && c.dimension === 'farmacoterapeuticas').map(c => ({ label: c.variable, detail: 'pendiente de valoración' }))
    },
    interventions: { done: by('done'), planned: by('planned'), recommended: by('recommended'), notApplicableCount: by('not_applicable').length },
    plan: { periodicity: [...r.periodicity.model].join(' '), nextReview: state.plan?.nextReview || '', notes: state.plan?.notes || '' },
    warnings
  };
}

/** Caso saneado (importación, caso guardado o borrador). El resultado nunca se toma del fichero. */
export function normalizeCase(input) {
  const s = input && typeof input === 'object' ? input : {};
  const ids = new Set(interventionCatalog(1).map(i => i.id));
  return {
    id: typeof s.id === 'string' && /^[\w-]{1,64}$/.test(s.id) ? s.id : '',
    pseudonym: str(s.pseudonym, 60), hospital: str(s.hospital, 200), pharmacist: str(s.pharmacist, 200),
    answers: cleanAnswers(s.answers), override: cleanOverride(s.override),
    statuses: Object.fromEntries(Object.entries(s.statuses && typeof s.statuses === 'object' ? s.statuses : {}).filter(([k, v]) => ids.has(k) && Object.hasOwn(INTERVENTION_STATUSES, v) && v !== 'recommended')),
    plan: { nextReview: /^\d{4}-\d{2}-\d{2}$/.test(s.plan?.nextReview || '') ? s.plan.nextReview : '', notes: str(s.plan?.notes, 2000) }
  };
}
export const serializeCase = state => ({ schema: CASE_SCHEMA, ...normalizeCase(state) });

/** Importación segura: sobre cmo-export/1 o JSON anterior (con `answers`). */
export function importAny(raw) {
  const parsed = parseEnvelope(raw, { appId: APP_ID });
  if (parsed.ok) return parsed.value.dataSchema === CASE_SCHEMA ? { ok: true, state: normalizeCase(parsed.value.data), legacy: false } : { ok: false, error: `Esquema de datos no compatible (se esperaba ${CASE_SCHEMA}).` };
  try {
    const old = JSON.parse(raw);
    const one = Array.isArray(old) ? old[0] : old;
    if (raw.length <= 1_000_000 && one && typeof one === 'object' && one.answers && typeof one.answers === 'object' && !one.schema) return { ok: true, state: normalizeCase(one), legacy: true };
  } catch { /* no es JSON */ }
  return { ok: false, error: parsed.error };
}

export function csvRows(state, ev) {
  const r = ev.result;
  return [['campo', 'valor'], ['esquema', CASE_SCHEMA], ['id', state.id], ['seudonimo', state.pseudonym], ['hospital', state.hospital], ['farmaceutico', state.pharmacist],
    ['estado', ev.provisional || !ev.applicable ? 'provisional' : 'final'], ['aplicable', ev.applicable ? 'si' : 'no'], ['puntuacion', r.total], ['prioridad_calculada', r.algorithmPriority], ['prioridad_final', r.finalPriority],
    ['prioridad_automatica', r.automaticPriorityReasons.join('; ')], ['modificacion_profesional', ev.overrideApplied ? r.override.justification : ''], ['variables_pendientes', r.missing.length],
    ...r.contributions.map(c => [`var_${c.variableId}`, c.missing ? 'pendiente' : c.option])];
}
