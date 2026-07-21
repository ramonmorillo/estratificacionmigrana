// Llamadas directas navegador→proveedor de IA (BYOK, sin backend propio).
// Este módulo NO persiste nada; solo construye la petición HTTPS y clasifica errores.
export const PROVIDERS={
  azure:{id:'azure',label:'Azure OpenAI (recomendado para uso institucional)',needsEndpoint:true,modelFieldLabel:'Nombre del deployment',modelKind:'text',defaultModel:'',endpointPlaceholder:'https://mi-recurso.openai.azure.com',endpointHelp:'URL base del recurso Azure OpenAI, sin ruta adicional (la herramienta añade /openai/deployments/{deployment}/chat/completions).'},
  openai:{id:'openai',label:'OpenAI',needsEndpoint:false,modelFieldLabel:'Modelo',modelKind:'select',modelOptions:['gpt-4o','gpt-4o-mini','gpt-4.1','o4-mini'],defaultModel:'gpt-4o'},
  anthropic:{id:'anthropic',label:'Anthropic',needsEndpoint:false,modelFieldLabel:'Modelo',modelKind:'select',modelOptions:['claude-sonnet-4-5','claude-opus-4-5','claude-haiku-4-5'],defaultModel:'claude-sonnet-4-5'}
};

export class ProviderError extends Error{constructor(kind,message){super(message);this.name='ProviderError';this.kind=kind}}

function messageFor(kind,providerLabel){switch(kind){
case'network':return `No se pudo conectar con ${providerLabel}. Verifique su conexión y la URL del endpoint.`;
case'auth':return'Clave API inválida o sin permisos. Revise la configuración.';
case'rate_limit':return'Cuota o límite de peticiones excedido. Espere unos segundos y reintente.';
case'server':return'El proveedor de IA ha respondido con un error. Reintente en unos minutos.';
case'timeout':return'La petición ha tardado demasiado. Reintente o pruebe modo manual.';
default:return'Error inesperado al conectar con el proveedor de IA.'}}

function classifyStatus(status){if(status===401||status===403)return'auth';if(status===429)return'rate_limit';return'server'}

async function postJson({url,headers,body,providerLabel,timeoutMs}){
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
let res;
try{res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:controller.signal})}
catch(e){clearTimeout(timer);if(e.name==='AbortError')throw new ProviderError('timeout',messageFor('timeout'));throw new ProviderError('network',messageFor('network',providerLabel))}
clearTimeout(timer);
if(!res.ok){const kind=classifyStatus(res.status);throw new ProviderError(kind,messageFor(kind,providerLabel))}
return res.json()}

async function requestOpenAiCompatible({url,headers,model,system,messages,providerLabel,timeoutMs,includeModelInBody}){
const body={messages:[{role:'system',content:system},...messages],response_format:{type:'json_object'},temperature:0};
if(includeModelInBody)body.model=model;
const data=await postJson({url,headers,body,providerLabel,timeoutMs});
const content=data?.choices?.[0]?.message?.content;
if(typeof content!=='string')throw new ProviderError('invalid_response','El proveedor no devolvió contenido de respuesta.');
return content}

async function requestAnthropic({apiKey,model,system,messages,providerLabel,timeoutMs}){
const data=await postJson({url:'https://api.anthropic.com/v1/messages',headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:{model,max_tokens:4096,system,messages,temperature:0},providerLabel,timeoutMs});
const content=Array.isArray(data?.content)?data.content.filter(b=>b&&b.type==='text').map(b=>b.text).join(''):'';
if(!content)throw new ProviderError('invalid_response','El proveedor no devolvió contenido de respuesta.');
return content}

export async function callProvider({provider,apiKey,endpoint,model,system,messages,timeoutMs=60000}){
const meta=PROVIDERS[provider];const providerLabel=meta?.label||provider;
if(provider==='azure'){const base=String(endpoint||'').trim().replace(/\/+$/,'');const url=`${base}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=2024-06-01`;return requestOpenAiCompatible({url,headers:{'api-key':apiKey},model,system,messages,providerLabel,timeoutMs,includeModelInBody:false})}
if(provider==='openai')return requestOpenAiCompatible({url:'https://api.openai.com/v1/chat/completions',headers:{Authorization:`Bearer ${apiKey}`},model,system,messages,providerLabel,timeoutMs,includeModelInBody:true});
if(provider==='anthropic')return requestAnthropic({apiKey,model,system,messages,providerLabel,timeoutMs});
throw new ProviderError('invalid_response','Proveedor no reconocido.')}
