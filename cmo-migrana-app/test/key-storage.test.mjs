import test from 'node:test';import assert from 'node:assert/strict';
// Node sin --experimental-webstorage no expone localStorage global: se define un shim mínimo
// en memoria antes de importar el módulo (que solo accede a localStorage dentro de funciones,
// nunca en su nivel superior, así que el orden de evaluación es seguro).
globalThis.localStorage=(()=>{const store=new Map();return{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}})();
const{encryptAndStoreKey,decryptStoredKey,hasStoredKey,getStoredConfig,clearStoredKey,getConsent,setConsent,revokeConsent}=await import('../src/key-storage.mjs');

test('sin clave guardada, hasStoredKey es false',()=>{clearStoredKey();assert.equal(hasStoredKey(),false)});

test('cifra y recupera la clave con la passphrase correcta; nunca en texto plano en el almacenamiento',async()=>{
await encryptAndStoreKey('sk-super-secreta-123',' frase-de-paso ',{provider:'openai',model:'gpt-4o'});
assert.equal(hasStoredKey(),true);
const raw=localStorage.getItem('cmo_migrana_ai_key_v1');
assert.ok(!raw.includes('sk-super-secreta-123'));
const recovered=await decryptStoredKey(' frase-de-paso ');
assert.equal(recovered,'sk-super-secreta-123');
assert.deepEqual(getStoredConfig(),{provider:'openai',model:'gpt-4o'})
});

test('passphrase incorrecta lanza error y no revela la clave',async()=>{
await encryptAndStoreKey('otra-clave-api','correcta',null);
await assert.rejects(decryptStoredKey('incorrecta'),/Frase de paso incorrecta/)
});

test('borrar clave guardada elimina clave y configuración',async()=>{
await encryptAndStoreKey('clave','pass',{provider:'azure'});
clearStoredKey();
assert.equal(hasStoredKey(),false);
assert.equal(getStoredConfig(),null)
});

test('consentimiento: se registra, se puede leer y se puede revocar',()=>{
revokeConsent();
assert.equal(getConsent(),null);
setConsent(true);
const c=getConsent();
assert.equal(c.accepted,true);
assert.ok(c.at);
revokeConsent();
assert.equal(getConsent(),null)
});
