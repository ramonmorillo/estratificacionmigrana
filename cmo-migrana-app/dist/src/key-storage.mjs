// Almacenamiento opcional de la clave API (BYOK) en este navegador.
// Por defecto la clave vive SOLO en memoria (modo "solo esta sesión") y este módulo no se usa.
// Si el usuario elige "recordar en este navegador", la clave se cifra con AES-GCM (SubtleCrypto)
// derivando la clave de cifrado de una frase de paso mediante PBKDF2. NUNCA se guarda en texto plano.
const STORAGE_KEY='cmo_migrana_ai_key_v1';
const CONFIG_KEY='cmo_migrana_ai_keyconfig_v1';
const CONSENT_KEY='cmo_migrana_ai_consent_v1';
const PBKDF2_ITERATIONS=150000;

function toB64(buf){return btoa(String.fromCharCode(...new Uint8Array(buf)))}
function fromB64(str){return Uint8Array.from(atob(str),c=>c.charCodeAt(0))}

async function deriveAesKey(passphrase,salt){
const enc=new TextEncoder();
const baseKey=await crypto.subtle.importKey('raw',enc.encode(passphrase),'PBKDF2',false,['deriveKey']);
return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:PBKDF2_ITERATIONS,hash:'SHA-256'},baseKey,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}

export function hasStoredKey(){return localStorage.getItem(STORAGE_KEY)!=null}

export function getStoredConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null')}catch{return null}}

export function clearStoredKey(){localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(CONFIG_KEY)}

export async function encryptAndStoreKey(apiKey,passphrase,config){
if(!passphrase)throw new Error('Indique una frase de paso para cifrar la clave.');
const salt=crypto.getRandomValues(new Uint8Array(16));
const iv=crypto.getRandomValues(new Uint8Array(12));
const aesKey=await deriveAesKey(passphrase,salt);
const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},aesKey,new TextEncoder().encode(apiKey));
localStorage.setItem(STORAGE_KEY,JSON.stringify({v:1,salt:toB64(salt),iv:toB64(iv),ciphertext:toB64(ciphertext)}));
if(config)localStorage.setItem(CONFIG_KEY,JSON.stringify(config));else localStorage.removeItem(CONFIG_KEY)}

export async function decryptStoredKey(passphrase){
const raw=localStorage.getItem(STORAGE_KEY);
if(!raw)throw new Error('No hay ninguna clave guardada en este navegador.');
let salt,iv,ciphertext;
try{({salt,iv,ciphertext}=JSON.parse(raw))}catch{throw new Error('El registro guardado está dañado. Borre la clave guardada y vuelva a guardarla.')}
const aesKey=await deriveAesKey(passphrase,fromB64(salt));
try{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(iv)},aesKey,fromB64(ciphertext));return new TextDecoder().decode(plain)}
catch{throw new Error('Frase de paso incorrecta.')}}

export function getConsent(){try{return JSON.parse(localStorage.getItem(CONSENT_KEY)||'null')}catch{return null}}
export function setConsent(accepted){localStorage.setItem(CONSENT_KEY,JSON.stringify({accepted:!!accepted,at:new Date().toISOString()}))}
export function revokeConsent(){localStorage.removeItem(CONSENT_KEY)}
