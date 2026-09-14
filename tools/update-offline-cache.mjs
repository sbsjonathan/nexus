import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),files=[];
const allowed=new Set(['.js','.css','.html','.svg','.ico','.png','.jpg','.pdf','.json','.webmanifest','.wasm','.bcmap','.pfb','.ttf','.icc']);
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(item.name.startsWith('.')||['tools','node_modules','paginas'].includes(item.name))continue;const full=path.join(dir,item.name);if(item.isDirectory())walk(full);else if(item.isFile()){const relative=path.relative(root,full).split(path.sep).join('/');if(allowed.has(path.extname(item.name))&&!['nexus-shell.js','nexus-sw.js','dados.js','esquema-embedded.css'].includes(relative))files.push(relative);}}}
walk(root);files.sort();const hash=createHash('sha256');for(const file of [...files,'nexus-sw.js']){hash.update(file);hash.update(fs.readFileSync(path.join(root,file)));}
const version=hash.digest('hex').slice(0,16);fs.writeFileSync(path.join(root,'nexus-shell.js'),'export const VERSION='+JSON.stringify(version)+';\nexport const FILES='+JSON.stringify(files)+';\n');console.log('Cache offline atualizado: '+version+' ('+files.length+' arquivos).');
