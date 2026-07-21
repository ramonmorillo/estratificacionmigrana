import test from 'node:test';import assert from 'node:assert/strict';import{callProvider,ProviderError,PROVIDERS}from'../src/ai-providers.mjs';

function fakeResponse({ok=true,status=200,body={}}){return{ok,status,json:async()=>body}}
function withFetch(impl,fn){const original=globalThis.fetch;globalThis.fetch=impl;return fn().finally(()=>{globalThis.fetch=original})}

test('los tres proveedores están definidos con etiqueta y valores por defecto',()=>{assert.ok(PROVIDERS.azure.needsEndpoint);assert.equal(PROVIDERS.openai.defaultModel,'gpt-4o');assert.equal(PROVIDERS.anthropic.defaultModel,'claude-sonnet-4-5')});

test('OpenAI: construye Authorization Bearer y llama al endpoint correcto',async()=>{let captured;await withFetch(async(url,opts)=>{captured={url,opts};return fakeResponse({body:{choices:[{message:{content:'{"a":1}'}}]}})},async()=>{
const out=await callProvider({provider:'openai',apiKey:'sk-test',model:'gpt-4o',system:'sys',messages:[{role:'user',content:'hola'}]});
assert.equal(out,'{"a":1}');
assert.equal(captured.url,'https://api.openai.com/v1/chat/completions');
assert.equal(captured.opts.headers.Authorization,'Bearer sk-test');
const body=JSON.parse(captured.opts.body);
assert.equal(body.model,'gpt-4o');
assert.equal(body.response_format.type,'json_object');
assert.equal(body.messages[0].role,'system')
})});

test('Azure: construye la URL de deployment a partir del endpoint y el modelo, sin exponer model en el body',async()=>{let captured;await withFetch(async(url,opts)=>{captured={url,opts};return fakeResponse({body:{choices:[{message:{content:'{}'}}]}})},async()=>{
await callProvider({provider:'azure',apiKey:'key',endpoint:'https://mi-recurso.openai.azure.com/',model:'mi-deployment',system:'sys',messages:[]});
assert.equal(captured.url,'https://mi-recurso.openai.azure.com/openai/deployments/mi-deployment/chat/completions?api-version=2024-06-01');
assert.equal(captured.opts.headers['api-key'],'key');
assert.equal(captured.opts.headers.Authorization,undefined);
const body=JSON.parse(captured.opts.body);
assert.equal(body.model,undefined)
})});

test('Anthropic: usa x-api-key, cabecera de acceso directo desde navegador y /v1/messages',async()=>{let captured;await withFetch(async(url,opts)=>{captured={url,opts};return fakeResponse({body:{content:[{type:'text',text:'{"ok":true}'}]}})},async()=>{
const out=await callProvider({provider:'anthropic',apiKey:'ak',model:'claude-sonnet-4-5',system:'sys',messages:[{role:'user',content:'hola'}]});
assert.equal(out,'{"ok":true}');
assert.equal(captured.url,'https://api.anthropic.com/v1/messages');
assert.equal(captured.opts.headers['x-api-key'],'ak');
assert.equal(captured.opts.headers['anthropic-dangerous-direct-browser-access'],'true');
const body=JSON.parse(captured.opts.body);
assert.equal(body.model,'claude-sonnet-4-5');
assert.equal(body.system,'sys')
})});

test('401/403 se clasifican como error de autenticación',async()=>{await withFetch(async()=>fakeResponse({ok:false,status:401}),async()=>{
await assert.rejects(callProvider({provider:'openai',apiKey:'bad',model:'gpt-4o',system:'s',messages:[]}),e=>{assert.ok(e instanceof ProviderError);assert.equal(e.kind,'auth');assert.match(e.message,/Clave API inválida/);return true})
})});

test('429 se clasifica como límite de peticiones',async()=>{await withFetch(async()=>fakeResponse({ok:false,status:429}),async()=>{
await assert.rejects(callProvider({provider:'openai',apiKey:'k',model:'gpt-4o',system:'s',messages:[]}),e=>{assert.equal(e.kind,'rate_limit');assert.match(e.message,/Cuota o límite/);return true})
})});

test('5xx se clasifica como error del proveedor',async()=>{await withFetch(async()=>fakeResponse({ok:false,status:503}),async()=>{
await assert.rejects(callProvider({provider:'anthropic',apiKey:'k',model:'claude-sonnet-4-5',system:'s',messages:[]}),e=>{assert.equal(e.kind,'server');assert.match(e.message,/ha respondido con un error/);return true})
})});

test('fallo de red (fetch lanza) se clasifica como error de conexión',async()=>{await withFetch(async()=>{throw new TypeError('Failed to fetch')},async()=>{
await assert.rejects(callProvider({provider:'openai',apiKey:'k',model:'gpt-4o',system:'s',messages:[]}),e=>{assert.equal(e.kind,'network');assert.match(e.message,/No se pudo conectar/);return true})
})});

test('timeout (AbortError) se clasifica como error de tiempo de espera',async()=>{await withFetch(async(url,opts)=>new Promise((_,reject)=>{opts.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})))}),async()=>{
await assert.rejects(callProvider({provider:'openai',apiKey:'k',model:'gpt-4o',system:'s',messages:[],timeoutMs:10}),e=>{assert.equal(e.kind,'timeout');assert.match(e.message,/tardado demasiado/);return true})
})});
