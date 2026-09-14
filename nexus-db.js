const NAME='nexus-mobile-library',VERSION=1;
let opened;
export function database(){
 if(!opened)opened=new Promise((resolve,reject)=>{const request=indexedDB.open(NAME,VERSION);request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('packages',{keyPath:'id'});const files=db.createObjectStore('files',{keyPath:'key'});files.createIndex('package','packageId');};request.onerror=()=>{opened=null;reject(request.error);};request.onblocked=()=>{opened=null;reject(Error('Feche as outras janelas do NEXUS e tente novamente.'));};request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opened=null;};resolve(db);};});
 return opened;
}
async function transact(stores,mode,action){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('Falha ao guardar os arquivos.'));tx.onabort=()=>reject(tx.error||Error('Operação cancelada.'));try{action(tx,value=>result=value);}catch(error){tx.abort();reject(error);}});}
export const listPackages=()=>transact(['packages'],'readonly',(tx,done)=>{const r=tx.objectStore('packages').getAll();r.onsuccess=()=>done(r.result);});
export const getPackage=id=>transact(['packages'],'readonly',(tx,done)=>{const r=tx.objectStore('packages').get(id);r.onsuccess=()=>done(r.result);});
export const putPackage=value=>transact(['packages'],'readwrite',tx=>{tx.objectStore('packages').put(value);});
export const putFile=(packageId,path,blob,type)=>transact(['files'],'readwrite',tx=>{tx.objectStore('files').put({key:packageId+'/'+path,packageId,path,blob,type});});
export const getFile=(packageId,path)=>transact(['files'],'readonly',(tx,done)=>{const r=tx.objectStore('files').get(packageId+'/'+path);r.onsuccess=()=>done(r.result);});
export const removePackage=id=>transact(['packages','files'],'readwrite',tx=>{tx.objectStore('packages').delete(id);const r=tx.objectStore('files').index('package').openKeyCursor(IDBKeyRange.only(id));r.onsuccess=()=>{const cursor=r.result;if(cursor){tx.objectStore('files').delete(cursor.primaryKey);cursor.continue();}};});
export async function cleanupStaging(){for(const p of await listPackages())if(p.status!=='ready'&&Date.now()-(p.updatedAt||p.createdAt)>24*60*60*1000)await removePackage(p.id);}
