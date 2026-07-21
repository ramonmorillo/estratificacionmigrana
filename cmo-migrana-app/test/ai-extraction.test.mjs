import test from 'node:test';import assert from 'node:assert/strict';import{VARIABLES}from'../src/core.mjs';import{buildFieldCatalog,buildPrompt,parseExtractionResponse,validateExtraction}from'../src/ai-extraction.mjs';

test('el catálogo de extracción incluye todas las variables del cuestionario con sus opciones',()=>{const catalog=buildFieldCatalog();assert.equal(catalog.length,VARIABLES.length);for(const v of VARIABLES){const f=catalog.find(c=>c.id===v.id);assert.ok(f,`falta ${v.id}`);assert.deepEqual(f.options.map(o=>o.id),v.options.map(o=>o.id))}});

test('el prompt generado incluye todos los campos, sus opciones y las instrucciones obligatorias',()=>{const prompt=buildPrompt('Paciente con migraña crónica, HIT-6 68.');for(const v of VARIABLES){assert.match(prompt,new RegExp(v.id));for(const o of v.options)assert.match(prompt,new RegExp(o.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))}assert.match(prompt,/EXCLUSIVAMENTE un objeto JSON/);assert.match(prompt,/null/);assert.match(prompt,/campos_no_encontrados/);assert.match(prompt,/citas_textuales/);assert.match(prompt,/Paciente con migraña crónica, HIT-6 68\./)});

test('JSON de respuesta válido y completo rellena y valida todos los campos',()=>{const full=Object.fromEntries(VARIABLES.map(v=>[v.id,v.options[0].id]));full.campos_no_encontrados=[];full.citas_textuales={[VARIABLES[0].id]:'cita de ejemplo'};const parsed=parseExtractionResponse(JSON.stringify(full));const r=validateExtraction(parsed);assert.equal(r.problems.length,0);assert.equal(r.filledCount,VARIABLES.length);assert.equal(r.citations[VARIABLES[0].id],'cita de ejemplo')});

test('JSON parcial con nulls solo rellena los campos disponibles y declara los no encontrados',()=>{const partial={};partial[VARIABLES[0].id]=VARIABLES[0].options[1].id;for(let i=1;i<VARIABLES.length;i++)partial[VARIABLES[i].id]=null;partial.campos_no_encontrados=VARIABLES.slice(1).map(v=>v.id);partial.citas_textuales={};const r=validateExtraction(parseExtractionResponse(JSON.stringify(partial)));assert.equal(r.filledCount,1);assert.deepEqual(r.filled[VARIABLES[0].id],VARIABLES[0].options[1].id);assert.equal(r.problems.length,0);assert.equal(r.notFoundDeclared.length,VARIABLES.length-1)});

test('JSON mal formado lanza error de parseo controlado (no rompe el flujo)',()=>{assert.throws(()=>parseExtractionResponse('{esto no es json'))});

test('valores fuera del esquema o de tipo incorrecto se reportan como incidencia sin romper el resto',()=>{const bad=Object.fromEntries(VARIABLES.map(v=>[v.id,v.options[0].id]));bad[VARIABLES[0].id]='valor_inventado_no_permitido';bad[VARIABLES[1].id]=123;const r=validateExtraction(bad);assert.equal(r.problems.length,2);assert.equal(r.filledCount,VARIABLES.length-2)});

test('respuesta que no es un objeto se reporta como incidencia global',()=>{const r=validateExtraction(['no','es','objeto']);assert.equal(r.problems.length,1);assert.equal(r.filledCount,0)});
