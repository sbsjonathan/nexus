import {ZipReader,BlobReader,BlobWriter,configure} from './vendor/zipjs/index-native.min.js';
import {listPackages,putPackage,putFile,removePackage} from './nexus-db.js';
import {validateManifest,safePath} from './nexus-manifest.js';
configure({useWebWorkers:false,useCompressionStream:true,chunkSize:65536});
const abort=signal=>{if(signal?.aborted)throw new DOMException('Importação cancelada.','AbortError');};
const digest=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');
export async function importFile(file,{onProgress=()=>{},signal}={}){
 const run=async()=>{
  abort(signal);if(!file?.size)throw Error('Escolha um arquivo ZIP do NEXUS MOBILE.');
  const reader=new ZipReader(new BlobReader(file),{checkSignature:true});let installation;
  try{
   onProgress({phase:'checking',label:'Conferindo o pacote…',loaded:0,total:0});
   const entries=new Map();let count=0;
   for await(const entry of reader.getEntriesGenerator()){
    abort(signal);if(++count>12500)throw Error('O pacote contém arquivos demais.');
    const path=entry.directory?entry.filename.replace(/\/$/,''):entry.filename;safePath(path);
    if(entries.has(entry.filename)||entry.encrypted||((entry.externalFileAttributes>>>16)&0xf000)===0xa000)throw Error('O ZIP contém uma entrada não permitida.');
    entries.set(entry.filename,entry);
   }
   const meta=entries.get('nexus-package.json');if(!meta||meta.directory||meta.uncompressedSize>5*1024*1024)throw Error('Este ZIP não é um pacote NEXUS MOBILE.');
   const manifest=validateManifest(JSON.parse(await (await meta.getData(new BlobWriter('application/json'),{signal,checkSignature:true})).text()));
   const declared=new Map(manifest.files.map(f=>[f.path,f]));
   for(const [path,e] of entries)if(!e.directory&&path!=='nexus-package.json'&&!declared.has(path))throw Error('Arquivo não declarado no pacote: '+path);
   for(const f of declared.values()){const e=entries.get(f.path);if(!e||e.directory||e.uncompressedSize!==f.size)throw Error('Arquivo ausente ou tamanho incorreto: '+f.path);}
   const duplicate=(await listPackages()).find(p=>p.status==='ready'&&p.manifest.id===manifest.id&&JSON.stringify(p.manifest.catalog)===JSON.stringify(manifest.catalog)&&JSON.stringify(p.manifest.schematics)===JSON.stringify(manifest.schematics)&&p.manifest.files.length===manifest.files.length&&p.manifest.files.every((f,i)=>f.sha256===manifest.files[i].sha256&&f.path===manifest.files[i].path));
   if(duplicate)return {record:duplicate,duplicate:true};
   const space=await navigator.storage?.estimate?.();if(space?.quota&&space.quota-(space.usage||0)<manifest.bytes+16*1024*1024)throw Error('Não há espaço suficiente no armazenamento do app. Libere espaço ou importe um pacote menor.');
   const persistent=await navigator.storage?.persist?.().catch(()=>false)||false;
   installation={id:crypto.randomUUID(),status:'staging',createdAt:Date.now(),updatedAt:Date.now(),manifest,persistent};
   await putPackage(installation);let loaded=0;
   for(const f of manifest.files){
    abort(signal);onProgress({phase:'extracting',label:f.path,loaded,total:manifest.bytes});
    const blob=await entries.get(f.path).getData(new BlobWriter(f.type),{signal,checkSignature:true});
    if(blob.size!==f.size||await digest(blob)!==f.sha256)throw Error('O arquivo está danificado: '+f.path+'. Copie o ZIP novamente.');
    abort(signal);await putFile(installation.id,f.path,blob,f.type);loaded+=f.size;
    installation.updatedAt=Date.now();await putPackage(installation);onProgress({phase:'saving',label:f.path,loaded,total:manifest.bytes});
   }
   abort(signal);installation.status='ready';await putPackage(installation);return {record:installation,duplicate:false};
  }catch(error){if(installation)await removePackage(installation.id).catch(()=>{});if(error.name==='QuotaExceededError')throw Error('O armazenamento do app ficou cheio. Importe um pacote menor ou libere espaço.');throw error;}
  finally{await reader.close();}
 };
 return navigator.locks? navigator.locks.request('nexus-library-write',{signal},run):run();
}
