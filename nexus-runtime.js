import {listPackages,cleanupStaging} from './nexus-db.js';
import {materialize,resourceUrl,safePath} from './nexus-manifest.js';
const baseCatalog=structuredClone(window.JCID_DEVICES||{version:1,models:[]}),baseRegistry=structuredClone(window.JCID_SCHEMATICS||{version:1,documents:[]});
let installed=[],offlinePromise,problem='';
export const status=()=>({packages:installed,error:problem,controlled:!!navigator.serviceWorker?.controller});
export function localResource(item,path){if(!item.nexus_package)return path;const record=installed.find(p=>p.id===item.nexus_package),clean=safePath(String(path).split('?')[0]);if(!record?.manifest.files.some(f=>f.path===clean))return null;return resourceUrl(item.nexus_package,clean);}
export async function ensureOffline(){
 if(!('serviceWorker' in navigator)||!window.isSecureContext)throw Error('Abra o endereço seguro do NEXUS para importar os arquivos.');
 if(!offlinePromise)offlinePromise=(async()=>{await navigator.serviceWorker.register(new URL('nexus-sw.js',import.meta.url),{type:'module',scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));return true;})().catch(error=>{offlinePromise=null;throw error;});
 let timer;try{return await Promise.race([offlinePromise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Ainda estamos preparando o app para uso offline. Aguarde um pouco e tente novamente.')),90000);})]);}finally{clearTimeout(timer);}
}
export async function refresh(){
 const ready=(await listPackages()).filter(p=>p.status==='ready').sort((a,b)=>a.createdAt-b.createdAt);installed=ready;
 if(ready.length)await ensureOffline();
 const models=new Map(baseCatalog.models.map(m=>[m.id,structuredClone(m)])),documents=new Map(baseRegistry.documents.map(d=>[d.id,structuredClone(d)]));
 for(const record of ready){const data=materialize(record);for(const m of data.models)models.set(m.id,m);for(const d of data.documents)documents.set(d.id,d);}
 window.JCID_DEVICES={version:1,models:[...models.values()].sort((a,b)=>(a.nexus_order??1000)-(b.nexus_order??1000))};window.JCID_SCHEMATICS={version:1,documents:[...documents.values()]};problem='';window.dispatchEvent(new CustomEvent('nexus:library'));return installed;
}
export async function start(){
 ensureOffline().then(()=>window.dispatchEvent(new CustomEvent('nexus:offline'))).catch(e=>{problem=e.message;window.dispatchEvent(new CustomEvent('nexus:offline'));});
 try{await cleanupStaging();await refresh();}catch(e){problem=e.message;}
}
