import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{VARIABLES}from'../src/core.mjs';
import{analyzeClinicalText,STATUS,LIMITATIONS}from'../src/local-extractor.mjs';

// Todos los textos son sintéticos, inventados para esta prueba: no proceden de historias
// clínicas reales de ningún paciente.
function find(text,variableId){return analyzeClinicalText(text).find(r=>r.variableId===variableId)}

test('el analizador devuelve exactamente una propuesta por cada variable del cuestionario, en el mismo orden',()=>{
const results=analyzeClinicalText('texto cualquiera');
assert.equal(results.length,VARIABLES.length);
assert.deepEqual(results.map(r=>r.variableId),VARIABLES.map(v=>v.id));
});

test('negaciones simples: "Niega ansiedad" marca ausencia explícita de comorbilidad psiquiátrica',()=>{
const r=find('Niega ansiedad y otros trastornos.','comorbilidades_psiquiatricas');
assert.equal(r.status,STATUS.AUSENTE);assert.equal(r.proposedValue,'no');assert.match(r.evidence,/Niega ansiedad/);
});

test('negaciones simples: "Sin hipertensión" marca ausencia explícita de comorbilidad cardiovascular',()=>{
const r=find('Sin hipertensión arterial ni otras comorbilidades.','comorbilidades_cardiovasculares');
assert.equal(r.status,STATUS.AUSENTE);assert.equal(r.proposedValue,'no');
});

test('negaciones con alcance limitado: la negación de una cláusula no contamina la siguiente',()=>{
const text='Sin antecedentes cardiovasculares. Presenta ansiedad de larga evolución.';
const cardio=find(text,'comorbilidades_cardiovasculares');
const psiq=find(text,'comorbilidades_psiquiatricas');
assert.equal(cardio.status,STATUS.AUSENTE);
assert.equal(psiq.status,STATUS.DETECTADO);assert.equal(psiq.proposedValue,'si');
});

test('negaciones con alcance limitado: "sin embargo" no se interpreta como negación',()=>{
const r=find('El tratamiento es correcto, sin embargo refiere ansiedad marcada.','comorbilidades_psiquiatricas');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'si');
});

test('antecedentes familiares: no se asigna la comorbilidad al paciente',()=>{
const r=find('Antecedente familiar de hipertensión arterial. Resto sin hallazgos relevantes.','comorbilidades_cardiovasculares');
assert.equal(r.status,STATUS.NO_MENCIONADO);
assert.notEqual(r.status,STATUS.DETECTADO);
});

test('antecedentes familiares: "madre con depresión" no marca comorbilidad psiquiátrica del paciente',()=>{
const r=find('Madre con depresión mayor. Paciente sin otros antecedentes psiquiátricos personales.','comorbilidades_psiquiatricas');
assert.notEqual(r.proposedValue,'si');
});

test('antecedentes familiares: el salto de línea de ajuste ("soft-wrap") entre "antecedente familiar de" y la condición no rompe la exclusión',()=>{
const r=find('Antecedente familiar de\nhipertensión arterial. Sin otros hallazgos.','comorbilidades_cardiovasculares');
assert.notEqual(r.status,STATUS.DETECTADO);
});

test('el salto de línea de ajuste dentro de una frase no la trocea en dos cláusulas distintas',()=>{
const r=find('Refiere buena adherencia al\ntratamiento, confirmada mediante registro de dispensación.','falta_adherencia');
assert.equal(r.status,STATUS.AUSENTE);assert.equal(r.proposedValue,'no');
});

test('un salto de línea en blanco (cambio de párrafo) sí actúa como límite de cláusula',()=>{
const r=find('Antecedente familiar de hipertensión.\n\nRefiere ansiedad de larga evolución.','comorbilidades_psiquiatricas');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'si');
});

test('datos no mencionados: nunca se propone un valor ni se interpreta como "no" o cero',()=>{
const results=analyzeClinicalText('Paciente que acude a revisión programada sin más datos.');
for(const r of results){
if(r.status===STATUS.NO_MENCIONADO){assert.equal(r.proposedValue,null);assert.equal(r.previewScore,null)}
}
const consumo=find('Paciente que acude a revisión programada sin más datos.','consumo_cafeina');
assert.equal(consumo.status,STATUS.NO_MENCIONADO);
});

test('expresiones dudosas: "no puede descartarse embarazo" no se marca como ausencia',()=>{
const r=find('No puede descartarse embarazo en el momento actual.','situacion_reproductiva');
assert.equal(r.status,STATUS.DUDOSO);assert.equal(r.proposedValue,null);
});

test('expresiones dudosas: "posible efecto adverso" queda como dudoso',()=>{
const r=find('Posible efecto adverso relacionado con el tratamiento actual.','efectos_adversos');
assert.equal(r.status,STATUS.DUDOSO);
});

test('información contradictoria: mención simultánea de naïve y tratamiento previo se marca dudosa',()=>{
const r=find('Paciente naïve que sin embargo se encuentra en tratamiento con topiramato desde hace un año.','paciente_naive');
assert.equal(r.status,STATUS.DUDOSO);assert.equal(r.proposedValue,null);
});

test('HIT-6 severo y MIDAS no severo aplica OR lógico sin marcar contradicción',()=>{
const r=find('HIT-6: 64 puntos. MIDAS: 3 puntos.','impacto_discapacidad');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'severo');
});

test('cifras y rangos: edad de 16 años se clasifica como menor de 18',()=>{
const r=find('Paciente de 16 años que acude acompañada de su madre.','edad');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'menor_18');
});

test('cifras y rangos: edad de 45 años se clasifica como adulto',()=>{
const r=find('Mujer de 45 años en seguimiento por migraña.','edad');
assert.equal(r.proposedValue,'hasta_60');
});

test('unidades: IMC 32 (obesidad OMS) marca alteración de peso/estado nutricional',()=>{
const r=find('IMC: 32.','peso_estado_nutricional');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'imc_mayor_30');
});

test('unidades: IMC 21 (rango normal OMS) no marca alteración',()=>{
const r=find('IMC: 21.','peso_estado_nutricional');
assert.equal(r.proposedValue,'imc_hasta_30');
});

test('criterios que requieren duración temporal: 12 días este mes no confirma uso excesivo por sí solo',()=>{
const r=find('Tomó sumatriptán 12 días este mes.','uso_excesivo_sintomatica');
assert.equal(r.status,STATUS.DUDOSO);assert.equal(r.proposedValue,null);
});

test('criterios que requieren duración temporal: 12-14 días/mes durante cuatro meses sí permite confirmar uso excesivo',()=>{
const r=find('Toma sumatriptán 12-14 días al mes durante cuatro meses.','uso_excesivo_sintomatica');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'si');
});

test('criterios que requieren duración temporal: migraña con ≥15 días/mes sin duración confirmada queda dudosa',()=>{
const r=find('Refiere 18 días de cefalea al mes en el último mes.','tipo_frecuencia_migrana');
assert.equal(r.status,STATUS.DUDOSO);
});

test('criterios que requieren duración temporal: ≥15 días/mes durante ≥3 meses confirma migraña de alta frecuencia',()=>{
const r=find('Refiere 18 días de cefalea al mes durante 4 meses.','tipo_frecuencia_migrana');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'cronica');
});

test('HIT-6: puntuación ≥60 se clasifica como impacto alto',()=>{
const r=find('HIT-6: 66 puntos.','impacto_discapacidad');
assert.equal(r.proposedValue,'severo');
});

test('HIT-6: puntuación 59 sin MIDAS severo se clasifica como no severa',()=>{
const r=find('HIT-6: 59 puntos.','impacto_discapacidad');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'no_severo');
});

test('MIDAS: puntuación ≥21 se clasifica como impacto alto',()=>{
const r=find('MIDAS: 24 puntos.','impacto_discapacidad');
assert.equal(r.proposedValue,'severo');
});

test('MIDAS: puntuación baja (<6) se clasifica como impacto bajo',()=>{
const r=find('MIDAS: 3 puntos.','impacto_discapacidad');
assert.equal(r.proposedValue,'no_severo');
});

test('días mensuales de cefalea: frecuencia baja explícita sin cronicidad',()=>{
const r=find('Refiere 4 días de cefalea al mes.','tipo_frecuencia_migrana');
assert.equal(r.proposedValue,'episodica_baja');
});

test('uso excesivo de medicación sintomática: analgésico simple bajo el umbral de 15 días no confirma uso excesivo',()=>{
const r=find('Toma paracetamol 8 días al mes durante 6 meses.','uso_excesivo_sintomatica');
assert.equal(r.status,STATUS.AUSENTE);assert.equal(r.proposedValue,'no');
});

test('uso excesivo de medicación sintomática: analgésico simple ≥15 días/mes durante ≥3 meses confirma criterio',()=>{
const r=find('Toma ibuprofeno 16 días al mes durante 5 meses.','uso_excesivo_sintomatica');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'si');
});

test('falta de adherencia: "olvida alguna dosis" queda dudosa, no confirma falta de adherencia',()=>{
const r=find('El paciente olvida alguna dosis ocasionalmente.','falta_adherencia');
assert.equal(r.status,STATUS.DUDOSO);assert.equal(r.proposedValue,null);
});

test('falta de adherencia: "buena adherencia" sin método de verificación queda dudosa',()=>{
const r=find('Refiere buena adherencia al tratamiento preventivo.','falta_adherencia');
assert.equal(r.status,STATUS.DUDOSO);
});

test('falta de adherencia: "buena adherencia" con método de verificación explícito confirma ausencia',()=>{
const r=find('Buena adherencia, confirmada mediante registro de dispensación en farmacia.','falta_adherencia');
assert.equal(r.status,STATUS.AUSENTE);assert.equal(r.proposedValue,'no');
});

test('falta de adherencia: "abandono del tratamiento" confirma falta de adherencia',()=>{
const r=find('Abandono del tratamiento preventivo hace dos meses.','falta_adherencia');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'si');
});

test('embarazo: mención directa sin negación se detecta',()=>{
const r=find('Paciente embarazada de 20 semanas.','situacion_reproductiva');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'embarazo');
});

test('embarazo: negación explícita ("niega embarazo") marca ausencia (no_aplica)',()=>{
const r=find('Niega embarazo actualmente.','situacion_reproductiva');
assert.equal(r.status,STATUS.AUSENTE);assert.equal(r.proposedValue,'no_aplica');
});

test('lactancia: mención directa se detecta',()=>{
const r=find('Actualmente en periodo de lactancia materna exclusiva.','situacion_reproductiva');
assert.equal(r.proposedValue,'lactancia');
});

test('deseo gestacional: mención directa se detecta',()=>{
const r=find('La paciente refiere deseo gestacional inminente.','situacion_reproductiva');
assert.equal(r.proposedValue,'deseo_gestacional');
});

test('embarazo: expresión de duda no se convierte en ausencia ni en detección confirmada',()=>{
const r=find('No puede descartarse embarazo; pendiente de prueba analítica.','situacion_reproductiva');
assert.equal(r.status,STATUS.DUDOSO);
});

test('edad inferior a 18 años: menor de edad detectado explícitamente',()=>{
const r=find('Adolescente de 15 años remitida por su pediatra.','edad');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'menor_18');
});

test('sexo: mención de mujer propone sexo femenino',()=>{
const r=find('Mujer de 30 años con migraña episódica.','sexo');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'femenino');
});

test('medicamentos de alto riesgo: solo propone "sí" ante coincidencia explícita, nunca "no" automático',()=>{
const conNada=find('Paciente sin tratamientos relevantes mencionados.','medicamentos_alto_riesgo');
assert.equal(conNada.status,STATUS.NO_MENCIONADO);
const conOpioide=find('En tratamiento con tramadol para el dolor.','medicamentos_alto_riesgo');
assert.equal(conOpioide.status,STATUS.DETECTADO);assert.equal(conOpioide.proposedValue,'si');
});

test('interacciones: "se descarta interacción" es ausencia explícita, no riesgo presente',()=>{
const r=find('Se descarta interacción relevante con el tratamiento concomitante.','riesgo_interacciones');
assert.equal(r.status,STATUS.AUSENTE);assert.equal(r.proposedValue,'no');
});

test('cambios de tratamiento: "sin cambios salvo aumento de dosis" sí detecta un cambio',()=>{
const r=find('Sin cambios en el tratamiento salvo aumento de dosis de propranolol.','cambios_tratamiento');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'si');
});

test('cambios de tratamiento: negación simple sin excepción confirma ausencia',()=>{
const r=find('Sin cambios en el tratamiento en la última revisión.','cambios_tratamiento');
assert.equal(r.status,STATUS.AUSENTE);assert.equal(r.proposedValue,'no');
});

test('pluripatología: ≥2 categorías de comorbilidad detectadas queda dudosa, no se confirma automáticamente',()=>{
const r=find('Presenta ansiedad y también hipertensión arterial mal controlada.','pluripatologia');
assert.equal(r.status,STATUS.DUDOSO);assert.equal(r.proposedValue,null);
});

test('pluripatología: mención explícita del término se detecta directamente',()=>{
const r=find('Paciente pluripatológico en seguimiento por varios servicios.','pluripatologia');
assert.equal(r.status,STATUS.DETECTADO);assert.equal(r.proposedValue,'si');
});

test('cada propuesta conserva el fragmento textual exacto y la regla aplicada',()=>{
const text='Niega ansiedad y otros trastornos psiquiátricos.';
const r=find(text,'comorbilidades_psiquiatricas');
assert.ok(r.evidence&&text.includes(r.evidence));
assert.ok(typeof r.rule==='string'&&r.rule.length>0);
});

test('el analizador es una función pura: no modifica el texto de entrada ni depende de estado externo',()=>{
const text='Niega embarazo. HIT-6: 66.';
const before=text;
analyzeClinicalText(text);
assert.equal(text,before);
const first=JSON.stringify(analyzeClinicalText(text));
const second=JSON.stringify(analyzeClinicalText(text));
assert.equal(first,second);
});

test('LIMITATIONS documenta explícitamente las limitaciones del analizador',()=>{
assert.ok(Array.isArray(LIMITATIONS)&&LIMITATIONS.length>0);
assert.ok(LIMITATIONS.some(l=>/datos no documentados|no mencionado|sexo/.test(l)));
assert.ok(LIMITATIONS.some(l=>/red/.test(l)));
});

test('ausencia total de solicitudes de red: el módulo no referencia fetch/XMLHttpRequest/axios',()=>{
const src=readFileSync(new URL('../src/local-extractor.mjs',import.meta.url),'utf8');
assert.doesNotMatch(src,/\bfetch\s*\(/);
assert.doesNotMatch(src,/XMLHttpRequest/);
assert.doesNotMatch(src,/\baxios\b/);
});

test('inexistencia de endpoints o claves: el módulo no referencia dominios de proveedores de IA ni credenciales',()=>{
const src=readFileSync(new URL('../src/local-extractor.mjs',import.meta.url),'utf8');
assert.doesNotMatch(src,/azure|openai|anthropic\.com|api[_-]?key/i);
});
