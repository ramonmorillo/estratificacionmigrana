// Preestratificación automática desde texto — analizador local, determinista y auditable.
//
// NO es inteligencia artificial generativa, NO usa ningún modelo ni servicio externo, y NO
// realiza ninguna solicitud de red: es un motor de reglas (expresiones regulares + heurísticas
// de negación/duda/antecedente-familiar) que se ejecuta íntegramente en el navegador sobre el
// texto que el propio profesional pega. Cada propuesta conserva el fragmento textual exacto que
// la sustenta y la regla que la produjo, y NUNCA se escribe en el cuestionario sin confirmación
// individual del profesional (ver STATUS más abajo).
//
// Limitaciones conocidas y documentadas (ver también LIMITATIONS al final del archivo):
// - Es un motor léxico de patrones, no un parser sintáctico ni un modelo de lenguaje: no
//   entiende la frase, solo reconoce cadenas y su entorno textual inmediato.
// - El alcance de una negación/duda se acota a una ventana de caracteres dentro de la misma
//   cláusula (separada por '.', ';' o salto de línea); redacciones muy largas o con puntuación
//   atípica pueden escapar a esa ventana.
// - Los umbrales numéricos (HIT-6, MIDAS, criterio de cronicidad ICHD-3, criterio de uso
//   excesivo de medicación sintomática, IMC de la OMS, ingesta de cafeína de referencia EFSA)
//   son estándares clínicos externos publicados, aplicados de forma orientativa porque el
//   documento fuente de esta herramienta no fija cifras concretas (ver core.mjs, VARIABLES,
//   definiciones "según documento"). No sustituyen el juicio clínico.
// - 'sexo' no tiene regla de detección: el modelo fuente no especifica qué condición concreta
//   puntúa como "riesgo" en esa variable, así que se deja siempre 'no_mencionado' para revisión
//   manual (mismo criterio conservador ya documentado en versiones anteriores de esta sección).
// - 'medicamentos_alto_riesgo' usa una lista orientativa y no exhaustiva (el listado completo
//   ISMP-España no está en este repositorio); solo propone "sí" ante coincidencia explícita,
//   nunca propone "no" automáticamente.
import{VARIABLES,normalizeText}from'./core.mjs';

export const STATUS={DETECTADO:'detectado',AUSENTE:'ausente_explicito',DUDOSO:'dudoso',NO_MENCIONADO:'no_mencionado'};

const CATALOG=Object.fromEntries(VARIABLES.map(v=>[v.id,v]));

// Reutiliza el mismo normalizador (NFD + strip de diacríticos + minúsculas) que ya usa core.mjs,
// para no duplicar lógica y garantizar el mismo criterio de comparación en toda la aplicación.
function normalize(s){return normalizeText(String(s??''))}

// El texto clínico pegado desde una HC real suele venir con saltos de línea de "ajuste de línea"
// en mitad de una frase (soft-wrap), que NO son un límite de cláusula real. Solo un salto de
// línea en blanco (dos o más '\n' seguidos) se trata como límite de cláusula (cambio de párrafo);
// un único '\n' se trata como un espacio normal. La sustitución conserva la longitud exacta del
// texto (mismo número de caracteres) para que los índices seguidos usados en la extracción de
// evidencia sigan alineados con el texto original.
function foldSoftLineBreaks(normText){return normText.replace(/\n+/g,run=>run.length>=2?' '.repeat(run.length-1)+'.':' ')}

function splitClauses(normText){const folded=foldSoftLineBreaks(normText);const clauses=[];const re=/[^.;]+/g;let m;while((m=re.exec(folded))){clauses.push({text:m[0],start:m.index})}return clauses}

// La redacción clínica en español suele escribir en letra los números pequeños (p. ej. "durante
// cuatro meses"), no solo en cifra. Se reconocen ambas formas para no perder criterios temporales
// por depender únicamente de dígitos.
const NUMBER_WORDS={uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12};
const NUMBER_TOKEN=`(\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')})`;
function parseNumberToken(tok){if(tok==null)return null;return/^\d+$/.test(tok)?parseInt(tok,10):(NUMBER_WORDS[tok]??null)}

const HEDGE_PATTERNS=[/no\s+(puede|se\s+puede|cabe)\s+descartar(se)?/,/no\s+se\s+descarta/,/pendiente\s+de\s+(confirmar|descartar|valorar)/,/\bposible\b/,/\bprobable\b/,/sospech/,/no\s+concluyente/,/\ba\s+valorar\b/,/no\s+esta\s+clar[oa]/,/dudos/,/no\s+se\s+puede\s+confirmar/,/podria/];
const NEGATION_PATTERNS=[/\bniega\b/,/\bsin\b(?!\s+embargo)/,/no\s+consta/,/no\s+presenta/,/se\s+descarta/,/ausencia\s+de/,/no\s+hay\b/,/no\s+refiere/,/descartad[oa]/,/\bno\b/];
// No se ancla a un conector concreto ("de"/"con") porque la redacción clínica varía ("antecedente
// familiar de X", "madre con X", "padre: X"); basta con que el término familiar aparezca en la
// ventana inmediatamente anterior al hallazgo para excluirlo de la atribución al paciente.
const FAMILY_HISTORY_PATTERN=/antecedente(s)?\s+famil\w*|\baf\b|\bmadre\b|\bpadre\b|\bhermano\b|\bhermana\b|\babuel[oa]\b/;

function windowBefore(clauseText,idx,size=45){return clauseText.slice(Math.max(0,idx-size),idx)}

// Clasifica una coincidencia léxica según su entorno textual inmediato (misma cláusula):
// antecedente familiar > duda/hedge > negación > detección positiva.
function classifyOccurrence(clauseText,idx){
const window=windowBefore(clauseText,idx,45);
if(FAMILY_HISTORY_PATTERN.test(window))return'excluir';
if(HEDGE_PATTERNS.some(r=>r.test(window)))return STATUS.DUDOSO;
if(NEGATION_PATTERNS.some(r=>r.test(window)))return STATUS.AUSENTE;
return STATUS.DETECTADO}

const STATUS_PRIORITY={[STATUS.DETECTADO]:3,[STATUS.DUDOSO]:2,[STATUS.AUSENTE]:1};

function clauseSnippet(rawText,normText,clause){const start=clause.start;const end=clause.start+clause.text.length;return rawText.slice(start,end).trim().slice(0,220)}

// Busca todas las coincidencias de una lista de patrones en el texto y devuelve la de mayor
// prioridad (detectado > dudoso > ausente); ignora coincidencias dentro del alcance de un
// antecedente familiar. Devuelve null si no hay ninguna coincidencia utilizable.
function bestMatch(normText,rawText,clauses,patterns){let best=null;
for(const clause of clauses){for(const pat of patterns){const re=new RegExp(pat.source,'g');let m;
while((m=re.exec(clause.text))){const status=classifyOccurrence(clause.text,m.index);if(status==='excluir')continue;
const priority=STATUS_PRIORITY[status];
if(!best||priority>best.priority){best={status,priority,clause,term:m[0],index:m.index}}}}}
return best}

function makeProposal(variableId,status,valueId,evidence,rule){const field=CATALOG[variableId];const option=valueId?field.options.find(o=>o.id===valueId):null;
return{variableId,label:field.label,dimension:field.dimension,status,proposedValue:status===STATUS.DETECTADO||status===STATUS.AUSENTE?valueId??null:null,proposedLabel:option?option.label:null,previewScore:option?option.score:null,evidence:evidence||null,rule,options:field.options.map(o=>({id:o.id,label:o.label}))}}

function noMencionado(variableId,rule){return makeProposal(variableId,STATUS.NO_MENCIONADO,null,null,rule||'No se ha encontrado ninguna mención reconocible para esta variable en el texto pegado.')}

// ---- Motor genérico para variables binarias sí/no basadas en listas de palabras clave ----
function binaryKeywordRule({variableId,positiveOption,negativeOption,keywords,categoryLabel}){
return(normText,rawText,clauses)=>{const best=bestMatch(normText,rawText,clauses,keywords);
if(!best)return noMencionado(variableId);
const snippet=clauseSnippet(rawText,normText,best.clause);
if(best.status===STATUS.DETECTADO)return makeProposal(variableId,STATUS.DETECTADO,positiveOption,snippet,`Mención de "${best.term}" (${categoryLabel}) sin negación ni duda detectada en el entorno inmediato del texto.`);
if(best.status===STATUS.DUDOSO)return makeProposal(variableId,STATUS.DUDOSO,null,snippet,`Expresión de incertidumbre junto a "${best.term}" (${categoryLabel}); requiere confirmación profesional.`);
if(best.status===STATUS.AUSENTE&&negativeOption)return makeProposal(variableId,STATUS.AUSENTE,negativeOption,snippet,`Negación explícita detectada junto a "${best.term}" (${categoryLabel}).`);
return noMencionado(variableId)}}

const psiquiatricasKeywords=[/ansiedad/,/depresi\w*/,/trastorno\s+bipolar/,/esquizofrenia/,/trastorno\s+de\s+panico/,/psiquiatric\w*/];
const noPsiquiatricasKeywords=[/diabetes/,/\basma\b/,/hipotiroidismo/,/hipertiroidismo/,/\bepoc\b/,/fibromialgia/,/epilepsia/];
const cardiovascularesKeywords=[/hipertensi\w*(\s+arterial)?/,/\bhta\b/,/cardiopat\w*/,/cardiovascular\w*/,/arritmia/,/insuficiencia\s+cardiaca/,/fibrilacion\s+auricular/,/\bictus\b/,/\back\b/];
const interaccionesKeywords=[/interacci\w+/];
const efectosAdversosKeywords=[/efecto(s)?\s+adverso(s)?/,/reaccion\s+adversa/,/mal\s+tolerad[oa]/,/intolerancia/];
const altoRiesgoKeywords=[/opioide/,/tramadol/,/morfina/,/oxicodona/,/acenocumarol/,/warfarina/,/heparina/,/insulina/,/metotrexato/];

const ruleComorbPsiq=binaryKeywordRule({variableId:'comorbilidades_psiquiatricas',positiveOption:'si',negativeOption:'no',keywords:psiquiatricasKeywords,categoryLabel:'comorbilidad psiquiátrica'});
const ruleComorbNoPsiq=binaryKeywordRule({variableId:'comorbilidades_no_psiquiatricas',positiveOption:'si',negativeOption:'no',keywords:noPsiquiatricasKeywords,categoryLabel:'comorbilidad no psiquiátrica'});
const ruleComorbCardio=binaryKeywordRule({variableId:'comorbilidades_cardiovasculares',positiveOption:'si',negativeOption:'no',keywords:cardiovascularesKeywords,categoryLabel:'comorbilidad cardiovascular'});
const ruleInteracciones=binaryKeywordRule({variableId:'riesgo_interacciones',positiveOption:'si',negativeOption:'no',keywords:interaccionesKeywords,categoryLabel:'riesgo de interacciones'});
const ruleEfectosAdversos=binaryKeywordRule({variableId:'efectos_adversos',positiveOption:'si',negativeOption:'no',keywords:efectosAdversosKeywords,categoryLabel:'efectos adversos'});
const ruleAltoRiesgo=binaryKeywordRule({variableId:'medicamentos_alto_riesgo',positiveOption:'si',negativeOption:null,keywords:altoRiesgoKeywords,categoryLabel:'medicamento de alto riesgo (lista orientativa, no exhaustiva)'});

// ---- Reglas específicas por variable ----

function ruleSituacionReproductiva(normText,rawText,clauses){
// "gestacion(?!al)" evita que "deseo gestacional" (concepto deseo_gestacional) también dispare
// el concepto embarazo por contener la subcadena "gestacion".
const concepts=[{id:'embarazo',patterns:[/embarazo/,/embarazada/,/gestante/,/gestacion(?!al)/]},{id:'lactancia',patterns:[/lactancia/,/lactante/,/amamant\w*/]},{id:'deseo_gestacional',patterns:[/deseo\s+gestacional/,/deseo\s+de\s+gestacion/,/deseo\s+de\s+embarazo/,/busca\s+embarazo/,/planificacion\s+de\s+embarazo/]}];
const found=[];
for(const c of concepts){const best=bestMatch(normText,rawText,clauses,c.patterns);if(best)found.push({...c,best})}
if(!found.length)return noMencionado('situacion_reproductiva');
const detected=found.filter(f=>f.best.status===STATUS.DETECTADO);
if(detected.length>1)return makeProposal('situacion_reproductiva',STATUS.DUDOSO,null,detected.map(d=>clauseSnippet(rawText,normText,d.best.clause)).join(' / '),'Se mencionan varias situaciones reproductivas simultáneamente; requiere confirmación de cuál aplica.');
if(detected.length===1)return makeProposal('situacion_reproductiva',STATUS.DETECTADO,detected[0].id,clauseSnippet(rawText,normText,detected[0].best.clause),`Mención directa de "${detected[0].best.term}" sin negación ni duda en el entorno inmediato.`);
const hedged=found.filter(f=>f.best.status===STATUS.DUDOSO);
if(hedged.length)return makeProposal('situacion_reproductiva',STATUS.DUDOSO,null,clauseSnippet(rawText,normText,hedged[0].best.clause),`Expresión de incertidumbre junto a "${hedged[0].best.term}"; no puede descartarse ni confirmarse.`);
const negated=found.filter(f=>f.best.status===STATUS.AUSENTE);
if(negated.length)return makeProposal('situacion_reproductiva',STATUS.AUSENTE,'no_aplica',clauseSnippet(rawText,normText,negated[0].best.clause),`Negación explícita junto a "${negated[0].best.term}"; no consta ninguna situación reproductiva de prioridad automática.`);
return noMencionado('situacion_reproductiva')}

function ruleEdad(normText,rawText,clauses){
const m=normText.match(/(\d{1,3})\s*anos(\s+de\s+edad)?/);
if(!m)return noMencionado('edad');
const age=parseInt(m[1],10);const idx=m.index;const clause=clauses.find(c=>idx>=c.start&&idx<c.start+c.text.length)||{text:m[0],start:idx};
const snippet=clauseSnippet(rawText,normText,clause);
if(age<18)return makeProposal('edad',STATUS.DETECTADO,'menor_18',snippet,`Edad numérica explícita (${age} años) inferior a 18.`);
return makeProposal('edad',STATUS.DETECTADO,'adulto',snippet,`Edad numérica explícita (${age} años) igual o superior a 18.`)}

function ruleSexo(){return noMencionado('sexo','El modelo fuente no especifica qué condición puntúa como "riesgo" en esta variable; requiere valoración manual (ver limitaciones del analizador).')}

function ruleImc(normText,rawText,clauses){
const explicit=bestMatch(normText,rawText,clauses,[/sobrepeso/,/obesidad/,/bajo\s+peso/,/desnutricion/,/malnutricion/]);
if(explicit&&explicit.status!=='excluir'){const snippet=clauseSnippet(rawText,normText,explicit.clause);
if(explicit.status===STATUS.DETECTADO)return makeProposal('peso_estado_nutricional',STATUS.DETECTADO,'alterado',snippet,`Mención explícita de "${explicit.term}".`);
if(explicit.status===STATUS.DUDOSO)return makeProposal('peso_estado_nutricional',STATUS.DUDOSO,null,snippet,`Expresión de incertidumbre junto a "${explicit.term}".`);
if(explicit.status===STATUS.AUSENTE)return makeProposal('peso_estado_nutricional',STATUS.AUSENTE,'normal',snippet,`Negación explícita junto a "${explicit.term}".`)}
const m=normText.match(/imc\D{0,10}(\d{1,2}(?:[.,]\d)?)/);
if(m){const value=parseFloat(m[1].replace(',','.'));const idx=m.index;const clause=clauses.find(c=>idx>=c.start&&idx<c.start+c.text.length)||{text:m[0],start:idx};const snippet=clauseSnippet(rawText,normText,clause);
if(value<18.5||value>=25)return makeProposal('peso_estado_nutricional',STATUS.DETECTADO,'alterado',snippet,`IMC calculado (${value}) fuera del rango de normalidad de la OMS (18,5–24,9), aplicado de forma orientativa.`);
return makeProposal('peso_estado_nutricional',STATUS.DETECTADO,'normal',snippet,`IMC calculado (${value}) dentro del rango de normalidad de la OMS (18,5–24,9), aplicado de forma orientativa.`)}
return noMencionado('peso_estado_nutricional')}

function ruleFrecuenciaMigrana(normText,rawText,clauses){
const chronic=bestMatch(normText,rawText,clauses,[/migrana\s+cronica/,/cefalea\s+cronica/]);
if(chronic&&chronic.status===STATUS.DETECTADO)return makeProposal('tipo_frecuencia_migrana',STATUS.DETECTADO,'alta',clauseSnippet(rawText,normText,chronic.clause),'Diagnóstico explícito de cronicidad en el texto.');
const episodic=bestMatch(normText,rawText,clauses,[/migrana\s+episodica/,/cefalea\s+episodica/]);
if(episodic&&episodic.status===STATUS.DETECTADO)return makeProposal('tipo_frecuencia_migrana',STATUS.DETECTADO,'baja',clauseSnippet(rawText,normText,episodic.clause),'Mención explícita de frecuencia episódica.');
const daysMatch=normText.match(/(\d{1,2})\s*(?:-|a)?\s*(\d{1,2})?\s*dias?\b[^]{0,25}\bmes/);
if(daysMatch){const days=Math.max(parseInt(daysMatch[1],10),parseInt(daysMatch[2]||daysMatch[1],10));const idx=daysMatch.index;const clause=clauses.find(c=>idx>=c.start&&idx<c.start+c.text.length)||{text:daysMatch[0],start:idx};const snippet=clauseSnippet(rawText,normText,clause);
const monthsMatch=clause.text.match(new RegExp(`${NUMBER_TOKEN}\\s*mes(es)?`));
const durationOk=monthsMatch&&parseNumberToken(monthsMatch[1])>=3;
if(days>=15&&durationOk)return makeProposal('tipo_frecuencia_migrana',STATUS.DETECTADO,'alta',snippet,'≥15 días de cefalea al mes durante ≥3 meses (criterio de cronicidad ICHD-3, aplicado de forma orientativa).');
if(days>=15&&!durationOk)return makeProposal('tipo_frecuencia_migrana',STATUS.DUDOSO,null,snippet,'≥15 días de cefalea al mes, pero no se confirma la duración temporal (≥3 meses) exigida por el criterio de cronicidad.');
return makeProposal('tipo_frecuencia_migrana',STATUS.DETECTADO,'baja',snippet,`Frecuencia mensual explícita (${days} días/mes) por debajo del umbral de cronicidad.`)}
return noMencionado('tipo_frecuencia_migrana')}

function ruleImpacto(normText,rawText,clauses){
const hit=normText.match(/hit-?6\D{0,10}(\d{1,3})/);
const midas=normText.match(/midas\D{0,10}(\d{1,3})/);
function clauseFor(idx,fallback){return clauses.find(c=>idx>=c.start&&idx<c.start+c.text.length)||{text:fallback,start:idx}}
let hitCat=null,midasCat=null,snippet=null;
if(hit){const v=parseInt(hit[1],10);const clause=clauseFor(hit.index,hit[0]);snippet=clauseSnippet(rawText,normText,clause);
hitCat=v>=60?'alto':v<50?'bajo':'zona_intermedia'}
if(midas){const v=parseInt(midas[1],10);const clause=clauseFor(midas.index,midas[0]);snippet=snippet||clauseSnippet(rawText,normText,clause);
midasCat=v>=21?'alto':v<6?'bajo':'zona_intermedia'}
if(!hit&&!midas)return noMencionado('impacto_discapacidad');
const cats=[hitCat,midasCat].filter(Boolean);
if(cats.includes('alto')&&cats.includes('bajo'))return makeProposal('impacto_discapacidad',STATUS.DUDOSO,null,snippet,'HIT-6 y MIDAS sugieren categorías de impacto contradictorias entre sí.');
if(cats.includes('alto'))return makeProposal('impacto_discapacidad',STATUS.DETECTADO,'alto',snippet,`Puntuación en rango de impacto grave (HIT-6≥60 o MIDAS≥21, umbrales publicados de cada instrumento, aplicados de forma orientativa).`);
if(cats.includes('zona_intermedia'))return makeProposal('impacto_discapacidad',STATUS.DUDOSO,null,snippet,'Puntuación en zona intermedia del instrumento (HIT-6 50–59 o MIDAS 6–20); no se corresponde con claridad a "bajo" ni "alto".');
return makeProposal('impacto_discapacidad',STATUS.DETECTADO,'bajo',snippet,'Puntuación por debajo del rango de impacto grave de HIT-6/MIDAS.')}

function ruleComorbAggregate(normText,rawText,clauses,results){
const explicit=bestMatch(normText,rawText,clauses,[/pluripatolog\w*/]);
if(explicit&&explicit.status===STATUS.DETECTADO)return makeProposal('pluripatologia',STATUS.DETECTADO,'si',clauseSnippet(rawText,normText,explicit.clause),'Mención explícita de pluripatología en el texto.');
if(explicit&&explicit.status===STATUS.AUSENTE)return makeProposal('pluripatologia',STATUS.AUSENTE,'no',clauseSnippet(rawText,normText,explicit.clause),'Negación explícita de pluripatología en el texto.');
const positives=['comorbilidades_psiquiatricas','comorbilidades_no_psiquiatricas','comorbilidades_cardiovasculares'].filter(id=>results[id]&&results[id].status===STATUS.DETECTADO);
if(positives.length>=2)return makeProposal('pluripatologia',STATUS.DUDOSO,null,positives.map(id=>results[id].evidence).filter(Boolean).join(' / '),'Se detectan ≥2 categorías de comorbilidad; la definición operativa de pluripatología no está especificada en el documento fuente y requiere confirmación profesional.');
return noMencionado('pluripatologia')}

function ruleNaive(normText,rawText,clauses){
const naive=bestMatch(normText,rawText,clauses,[/\bnaive\b/,/sin\s+tratamiento\s+previo/,/no\s+ha\s+recibido\s+tratamiento\s+previo/,/primera\s+linea\s+de\s+tratamiento/]);
const tratado=bestMatch(normText,rawText,clauses,[/tratado\s+previamente/,/en\s+tratamiento\s+con/,/recibe\s+actualmente/,/tratamiento\s+previo\s+con/]);
const naiveHit=naive&&naive.status===STATUS.DETECTADO;
const tratadoHit=tratado&&tratado.status===STATUS.DETECTADO;
if(naiveHit&&tratadoHit)return makeProposal('paciente_naive',STATUS.DUDOSO,null,`${clauseSnippet(rawText,normText,naive.clause)} / ${clauseSnippet(rawText,normText,tratado.clause)}`,'El texto menciona a la vez indicios de "naïve" y de tratamiento previo; contradictorio, requiere confirmación.');
if(naiveHit)return makeProposal('paciente_naive',STATUS.DETECTADO,'naive',clauseSnippet(rawText,normText,naive.clause),`Mención de "${naive.term}" compatible con paciente naïve.`);
if(tratadoHit)return makeProposal('paciente_naive',STATUS.DETECTADO,'tratado',clauseSnippet(rawText,normText,tratado.clause),`Mención de "${tratado.term}" compatible con tratamiento previo.`);
return noMencionado('paciente_naive')}

function ruleViaAdministracion(normText,rawText,clauses){
const compleja=bestMatch(normText,rawText,clauses,[/subcutane\w*/,/intravenos\w*/,/\binfusion\b/,/parenteral/,/bomba\s+de\s+infusion/]);
const simple=bestMatch(normText,rawText,clauses,[/via\s+oral/,/\boral\b/]);
const complejaHit=compleja&&compleja.status===STATUS.DETECTADO;
const simpleHit=simple&&simple.status===STATUS.DETECTADO;
if(complejaHit&&simpleHit)return makeProposal('via_administracion',STATUS.DUDOSO,null,`${clauseSnippet(rawText,normText,compleja.clause)} / ${clauseSnippet(rawText,normText,simple.clause)}`,'Se mencionan vías de administración de distinta complejidad; requiere confirmación de cuál es la relevante.');
if(complejaHit)return makeProposal('via_administracion',STATUS.DETECTADO,'compleja',clauseSnippet(rawText,normText,compleja.clause),`Mención de vía "${compleja.term}", de mayor complejidad.`);
if(simpleHit)return makeProposal('via_administracion',STATUS.DETECTADO,'simple',clauseSnippet(rawText,normText,simple.clause),`Mención de vía "${simple.term}", de menor complejidad.`);
return noMencionado('via_administracion')}

function ruleFracasosAntiCgrp(normText,rawText,clauses){
const drugPattern=/anti-?cgrp|erenumab|galcanezumab|fremanezumab|eptinezumab/;
const failurePattern=/fracas\w*|no\s+responde|ineficaz|inefectiv\w*/;
for(const clause of clauses){if(drugPattern.test(clause.text)&&failurePattern.test(clause.text)){
const idx=clause.text.search(failurePattern);const status=classifyOccurrence(clause.text,idx);
if(status==='excluir')continue;
const snippet=clauseSnippet(rawText,normText,clause);
if(status===STATUS.DUDOSO)return makeProposal('fracasos_anti_cgrp',STATUS.DUDOSO,null,snippet,'Mención de fracaso a anti-CGRP con expresión de incertidumbre próxima.');
if(status===STATUS.AUSENTE)return makeProposal('fracasos_anti_cgrp',STATUS.AUSENTE,'no',snippet,'Negación explícita de fracaso a tratamiento anti-CGRP.');
return makeProposal('fracasos_anti_cgrp',STATUS.DETECTADO,'si',snippet,'Mención de fracaso previo a tratamiento(s) anti-CGRP.')}}
const goodResponse=bestMatch(normText,rawText,clauses,[/buena\s+respuesta\s+a\s+anti-?cgrp/,/sin\s+fracasos?\s+previos?\s+a\s+anti-?cgrp/]);
if(goodResponse&&goodResponse.status!=='excluir')return makeProposal('fracasos_anti_cgrp',STATUS.AUSENTE,'no',clauseSnippet(rawText,normText,goodResponse.clause),'Mención explícita de ausencia de fracasos previos / buena respuesta a anti-CGRP.');
return noMencionado('fracasos_anti_cgrp')}

const TRIPTAN_OR_STRONG=/sumatriptan|rizatriptan|zolmitriptan|eletriptan|naratriptan|almotriptan|frovatriptan|opioide|ergotamina|analgesic\w*\s+combinad\w*/;
const SIMPLE_ANALGESIC=/paracetamol|ibuprofeno|aines|antiinflamatorio|aspirina|acido\s+acetilsalicilico/;

function ruleUsoExcesivo(normText,rawText,clauses){
const negation=bestMatch(normText,rawText,clauses,[/sin\s+uso\s+excesivo\s+de\s+medicacion\s+sintomatica/,/uso\s+adecuado\s+de\s+medicacion\s+de\s+rescate/]);
if(negation&&negation.status!=='excluir')return makeProposal('uso_excesivo_sintomatica',STATUS.AUSENTE,'no',clauseSnippet(rawText,normText,negation.clause),'Negación explícita de uso excesivo de medicación sintomática.');
for(const clause of clauses){
const isStrong=TRIPTAN_OR_STRONG.test(clause.text);const isSimple=SIMPLE_ANALGESIC.test(clause.text);
if(!isStrong&&!isSimple)continue;
const daysMatch=clause.text.match(/(\d{1,2})\s*(?:-|a)?\s*(\d{1,2})?\s*dias?/);
if(!daysMatch)continue;
const days=Math.max(parseInt(daysMatch[1],10),parseInt(daysMatch[2]||daysMatch[1],10));
const threshold=isStrong?10:15;
const monthsMatch=clause.text.match(new RegExp(`durante\\s+${NUMBER_TOKEN}\\s*mes(es)?`));
const chronicWording=/de\s+forma\s+habitual|cronic\w*|mantenid\w*\s+en\s+el\s+tiempo/.test(clause.text);
const durationOk=(monthsMatch&&parseNumberToken(monthsMatch[1])>=3)||chronicWording;
const snippet=clauseSnippet(rawText,normText,clause);
if(days>=threshold&&durationOk)return makeProposal('uso_excesivo_sintomatica',STATUS.DETECTADO,'si',snippet,`Frecuencia (${days} días/mes, umbral ${threshold} para ${isStrong?'triptanes/opioides/ergóticos':'analgésicos simples'}) y duración (≥3 meses) compatibles con criterio de uso excesivo (orientativo, tipo ICHD-3).`);
if(days>=threshold&&!durationOk)return makeProposal('uso_excesivo_sintomatica',STATUS.DUDOSO,null,snippet,`Frecuencia (${days} días/mes) compatible con el umbral de uso excesivo, pero no se confirma el criterio temporal de continuidad (≥3 meses).`);
return makeProposal('uso_excesivo_sintomatica',STATUS.AUSENTE,'no',snippet,`Frecuencia explícita (${days} días/mes) por debajo del umbral (${threshold}) definido para este fármaco.`)}
return noMencionado('uso_excesivo_sintomatica')}

function ruleCambiosTratamiento(normText,rawText,clauses){
for(const clause of clauses){const m=clause.text.match(/sin\s+cambios?\b[^]{0,50}?\b(salvo|excepto|aunque|pero)\b[^]{0,60}/);
if(m)return makeProposal('cambios_tratamiento',STATUS.DETECTADO,'si',clauseSnippet(rawText,normText,clause),`Excepción tras negación ("sin cambios ${m[1]}...") — pese a "sin cambios" se describe un cambio concreto.`)}
const best=bestMatch(normText,rawText,clauses,[/cambios?\s+(de|en)\s+(el\s+)?tratamiento/,/se\s+modifica\s+el\s+tratamiento/,/aumento\s+de\s+dosis/,/se\s+ajusta\s+la\s+dosis/,/se\s+suspende/,/se\s+inicia\s+tratamiento/,/cambio\s+de\s+preventivo/]);
if(!best)return noMencionado('cambios_tratamiento');
const snippet=clauseSnippet(rawText,normText,best.clause);
if(best.status===STATUS.DETECTADO)return makeProposal('cambios_tratamiento',STATUS.DETECTADO,'si',snippet,`Mención de "${best.term}" compatible con cambio de tratamiento.`);
if(best.status===STATUS.DUDOSO)return makeProposal('cambios_tratamiento',STATUS.DUDOSO,null,snippet,`Expresión de incertidumbre junto a "${best.term}".`);
if(best.status===STATUS.AUSENTE)return makeProposal('cambios_tratamiento',STATUS.AUSENTE,'no',snippet,`Negación explícita junto a "${best.term}".`);
return noMencionado('cambios_tratamiento')}

function ruleAdherencia(normText,rawText,clauses){
const olvidos=bestMatch(normText,rawText,clauses,[/olvida\s+alguna\s+dosis/,/olvido\s+ocasional/,/olvida\s+ocasionalmente/]);
if(olvidos&&olvidos.status!=='excluir')return makeProposal('falta_adherencia',STATUS.DUDOSO,null,clauseSnippet(rawText,normText,olvidos.clause),'Mención de olvidos ocasionales de dosis; no confirma por sí sola falta de adherencia, requiere confirmación.');
const badKeywords=bestMatch(normText,rawText,clauses,[/abandono\s+del\s+tratamiento/,/incumplimiento\s+terapeutico/,/mala\s+adherencia/,/adherencia\s+deficiente/,/no\s+toma\s+la\s+medicacion\s+segun\s+lo\s+pautado/]);
if(badKeywords&&badKeywords.status===STATUS.DETECTADO)return makeProposal('falta_adherencia',STATUS.DETECTADO,'si',clauseSnippet(rawText,normText,badKeywords.clause),`Mención explícita de "${badKeywords.term}".`);
const methodPattern=/recuento\s+de\s+comprimidos|registro\s+de\s+dispensacion|cuestionario\s+morisky|monitorizacion\s+electronica/;
for(const clause of clauses){if(/buena\s+adherencia/.test(clause.text)){
if(methodPattern.test(clause.text))return makeProposal('falta_adherencia',STATUS.AUSENTE,'no',clauseSnippet(rawText,normText,clause),'Adherencia declarada como buena y verificada mediante método objetivo (recuento, registro de dispensación o cuestionario validado).');
return makeProposal('falta_adherencia',STATUS.DUDOSO,null,clauseSnippet(rawText,normText,clause),'Adherencia declarada como "buena" sin especificar método de verificación; no puede confirmarse automáticamente.')}}
return noMencionado('falta_adherencia')}

function ruleConsumoCafeina(normText,rawText,clauses){
const negation=bestMatch(normText,rawText,clauses,[/no\s+toma\s+cafe/,/sin\s+consumo\s+de\s+cafeina/]);
if(negation&&negation.status!=='excluir')return makeProposal('consumo_cafeina',STATUS.AUSENTE,'adecuado',clauseSnippet(rawText,normText,negation.clause),'Negación explícita de consumo de cafeína.');
const qty=normText.match(/(\d{1,2})\s*(tazas?|cafes?|bebidas?\s+de\s+cola|energeticas?)\s*(al\s+dia|diari\w*)?/);
if(qty){const n=parseInt(qty[1],10);const idx=qty.index;const clause=clauses.find(c=>idx>=c.start&&idx<c.start+c.text.length)||{text:qty[0],start:idx};const snippet=clauseSnippet(rawText,normText,clause);
if(n>4)return makeProposal('consumo_cafeina',STATUS.DETECTADO,'alto',snippet,`Consumo cuantificado (${n}/día) por encima de la ingesta diaria de referencia (EFSA, ≈400 mg/día ≈4 tazas), aplicado de forma orientativa.`);
return makeProposal('consumo_cafeina',STATUS.DETECTADO,'adecuado',snippet,`Consumo cuantificado (${n}/día) dentro de la ingesta diaria de referencia.`)}
const qualitative=bestMatch(normText,rawText,clauses,[/cafeina/,/\bcafe\b/]);
if(qualitative&&qualitative.status===STATUS.DETECTADO)return makeProposal('consumo_cafeina',STATUS.DUDOSO,null,clauseSnippet(rawText,normText,qualitative.clause),'Se menciona consumo de cafeína sin cuantificar; no puede clasificarse automáticamente.');
return noMencionado('consumo_cafeina')}

function ruleSueno(normText,rawText,clauses){
const best=bestMatch(normText,rawText,clauses,[/insomnio/,/duerme\s+mal/,/sueno\s+fragmentado/,/apnea\s+del\s+sueno/,/mala\s+calidad\s+del\s+sueno/,/duerme\s+bien/,/buen\s+descanso/]);
if(!best)return noMencionado('habitos_sueno');
const alteredTerms=/insomnio|duerme\s+mal|sueno\s+fragmentado|apnea|mala\s+calidad/;
const snippet=clauseSnippet(rawText,normText,best.clause);
if(best.status===STATUS.DUDOSO)return makeProposal('habitos_sueno',STATUS.DUDOSO,null,snippet,`Expresión de incertidumbre junto a "${best.term}".`);
if(alteredTerms.test(best.term)){if(best.status===STATUS.AUSENTE)return makeProposal('habitos_sueno',STATUS.AUSENTE,'adecuados',snippet,`Negación explícita junto a "${best.term}".`);return makeProposal('habitos_sueno',STATUS.DETECTADO,'alterados',snippet,`Mención de "${best.term}".`)}
return makeProposal('habitos_sueno',STATUS.DETECTADO,'adecuados',snippet,`Mención de "${best.term}".`)}

function ruleSocioeconomico(normText,rawText,clauses){
const desfavorable=bestMatch(normText,rawText,clauses,[/situacion\s+socioeconomica\s+desfavorable/,/vulnerabilidad\s+social/,/dificultades\s+economicas/,/sin\s+recursos/,/exclusion\s+social/,/precariedad/]);
if(desfavorable&&desfavorable.status===STATUS.DETECTADO)return makeProposal('nivel_socioeconomico',STATUS.DETECTADO,'desfavorable',clauseSnippet(rawText,normText,desfavorable.clause),`Mención explícita de "${desfavorable.term}".`);
const favorable=bestMatch(normText,rawText,clauses,[/sin\s+dificultades\s+socioeconomicas/,/situacion\s+socioeconomica\s+favorable/]);
if(favorable&&favorable.status!=='excluir')return makeProposal('nivel_socioeconomico',STATUS.AUSENTE,'favorable',clauseSnippet(rawText,normText,favorable.clause),'Mención explícita de ausencia de dificultades socioeconómicas.');
return noMencionado('nivel_socioeconomico')}

function ruleFormacionPaciente(normText,rawText,clauses){
const dificultad=bestMatch(normText,rawText,clauses,[/dificultad\s+para\s+comprender/,/bajo\s+nivel\s+de\s+comprension/,/no\s+comprende\s+las\s+instrucciones/,/dificultad\s+en\s+el\s+manejo\s+de\s+la\s+pauta/,/analfabetismo\s+funcional/]);
if(dificultad&&dificultad.status===STATUS.DETECTADO)return makeProposal('formacion_paciente',STATUS.DETECTADO,'dificultad',clauseSnippet(rawText,normText,dificultad.clause),`Mención explícita de "${dificultad.term}".`);
const sinDificultad=bestMatch(normText,rawText,clauses,[/buena\s+comprension/,/comprende\s+adecuadamente\s+la\s+pauta/,/sin\s+dificultades\s+de\s+comprension/]);
if(sinDificultad&&sinDificultad.status!=='excluir')return makeProposal('formacion_paciente',STATUS.AUSENTE,'sin_dificultad',clauseSnippet(rawText,normText,sinDificultad.clause),'Mención explícita de buena comprensión/manejo de la pauta.');
return noMencionado('formacion_paciente')}

// Orden de ejecución: primero las variables independientes, luego pluripatología (que agrega
// los resultados de las tres variables de comorbilidad ya calculadas).
export function analyzeClinicalText(rawText){
const text=String(rawText??'');
const normText=normalize(text);
const clauses=splitClauses(normText);
const results={};
results.situacion_reproductiva=ruleSituacionReproductiva(normText,text,clauses);
results.edad=ruleEdad(normText,text,clauses);
results.sexo=ruleSexo();
results.peso_estado_nutricional=ruleImc(normText,text,clauses);
results.tipo_frecuencia_migrana=ruleFrecuenciaMigrana(normText,text,clauses);
results.impacto_discapacidad=ruleImpacto(normText,text,clauses);
results.comorbilidades_psiquiatricas=ruleComorbPsiq(normText,text,clauses);
results.comorbilidades_no_psiquiatricas=ruleComorbNoPsiq(normText,text,clauses);
results.comorbilidades_cardiovasculares=ruleComorbCardio(normText,text,clauses);
results.pluripatologia=ruleComorbAggregate(normText,text,clauses,results);
results.paciente_naive=ruleNaive(normText,text,clauses);
results.via_administracion=ruleViaAdministracion(normText,text,clauses);
results.riesgo_interacciones=ruleInteracciones(normText,text,clauses);
results.fracasos_anti_cgrp=ruleFracasosAntiCgrp(normText,text,clauses);
results.uso_excesivo_sintomatica=ruleUsoExcesivo(normText,text,clauses);
results.cambios_tratamiento=ruleCambiosTratamiento(normText,text,clauses);
results.efectos_adversos=ruleEfectosAdversos(normText,text,clauses);
results.falta_adherencia=ruleAdherencia(normText,text,clauses);
results.medicamentos_alto_riesgo=ruleAltoRiesgo(normText,text,clauses);
results.consumo_cafeina=ruleConsumoCafeina(normText,text,clauses);
results.habitos_sueno=ruleSueno(normText,text,clauses);
results.nivel_socioeconomico=ruleSocioeconomico(normText,text,clauses);
results.formacion_paciente=ruleFormacionPaciente(normText,text,clauses);
return VARIABLES.map(v=>results[v.id])}

export const LIMITATIONS=[
'Motor de reglas léxicas (expresiones regulares + heurísticas de negación/duda/antecedente familiar), no un parser sintáctico ni un modelo de lenguaje: no "entiende" la frase, solo reconoce patrones y su entorno textual inmediato.',
'El alcance de una negación o expresión de duda se limita a una ventana de caracteres dentro de la misma cláusula (separada por punto, punto y coma o salto de línea); redacciones muy largas, con abreviaturas atípicas o puntuación inusual pueden escapar a esa ventana y no detectarse correctamente.',
'Los umbrales numéricos utilizados (HIT-6, MIDAS, criterio de cronicidad y de uso excesivo de medicación sintomática tipo ICHD-3, clasificación OMS del IMC, ingesta de referencia de cafeína EFSA) son estándares clínicos externos publicados, aplicados de forma orientativa porque el documento fuente de esta herramienta no fija cifras concretas para estas variables.',
'La variable "sexo" no tiene regla de detección automática: el documento fuente no especifica qué condición puntúa como "riesgo"; se deja siempre "no mencionado" para valoración manual.',
'La variable "medicamentos de alto riesgo" usa una lista orientativa y no exhaustiva; el listado completo ISMP-España no está disponible en este repositorio. Solo propone "sí" ante coincidencia explícita, nunca propone "no" de forma automática.',
'Ninguna propuesta se traslada al cuestionario sin confirmación individual explícita del profesional; los campos no mencionados nunca se convierten en una respuesta negativa ni en una puntuación de cero.',
'El analizador no realiza ninguna solicitud de red: todo el procesamiento ocurre en el navegador sobre el texto pegado, que no se transmite ni se almacena fuera de la memoria de la sesión.'
];
