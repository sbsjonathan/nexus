(async () => {
 'use strict';
 await (window.NexusReady||Promise.resolve());
 const $=id=>document.getElementById(id),viewer=$('pageViewer'),stack=$('pageStack'),query=new URLSearchParams(location.search),origin=location.origin;
 const documents=window.JCID_SCHEMATICS?.documents||[],doc=documents.find(d=>d.id===(query.get('schematic')||'iphone-11-schematic'));
 if(!doc){$('viewerStatus').textContent='Este esquemático não está disponível.';for(const el of document.querySelectorAll('button,input,select'))el.disabled=true;return;}
 const context={schematicId:doc.id,boardId:query.get('board')||doc.board_ids?.[0]||'',session:query.get('session')||'standalone'},canSync=(doc.board_ids||[]).includes(context.boardId);
 window.JCID_CURRENT_SCHEMATIC=doc;document.title=doc.title;$('viewerTitle').textContent=doc.title;$('originalPdf').href=doc.pdf;
 const loadingControls=[...document.querySelectorAll('button,input,select')].map(el=>({el,disabled:el.disabled}));for(const {el} of loadingControls)el.disabled=true;
 let D;try{const response=await fetch(doc.index);if(!response.ok)throw Error('Index unavailable');D=await response.json();if(!D.pages?.length||!Array.isArray(D.regions))throw Error('Invalid index');}catch(error){$('viewerStatus').textContent='Não foi possível abrir o esquema. Reabra este documento.';return;}
 for(const {el,disabled} of loadingControls)el.disabled=disabled;
 $('viewerStatus').textContent='Arraste para mover · roda para ampliar.';
 const embedded=query.get('embedded')==='1',host=embedded?window.parent:window.opener,svgNS='http://www.w3.org/2000/svg';
 const model=query.get('model')||doc.modelIds[0];for(const source of documents.filter(d=>d.modelIds.includes(model)&&Boolean(d.type==='reference')===Boolean(doc.type==='reference'))){const option=document.createElement('option');option.value=source.id;option.textContent=source.title;$('viewerDocument').append(option);}$('viewerDocument').value=doc.id;
 $('viewerDocument').addEventListener('change',()=>{const next=$('viewerDocument').value;if(host){send('document',{documentId:next});$('viewerDocument').value=doc.id;}else{const params=new URLSearchParams({schematic:next,model});location.href='esquema.html?'+params;}});
 document.body.classList.toggle('embedded',embedded);$('dockViewer').hidden=!(host&&!embedded);
 const pages=[...D.pages].sort((a,b)=>a.page-b.page),byPage=new Map(),byName=new Map(),shells=new Map(),mounted=new Map();
 const state={zoom:.35,fit:'width',page:pages[0].page,selected:null,name:'',searchMatches:null,layout:[],width:0,height:0};
 let raf=0,drag=null,suppressClick=false,pending=null;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const send=(type,extra={})=>{if(host)host.postMessage({channel:'jcid-workbench',...context,type,...extra},origin);};
 for(const r of D.regions){const key=r.identifier.toUpperCase();if(!byName.has(key))byName.set(key,[]);byName.get(key).push(r);if(!byPage.has(r.page))byPage.set(r.page,[]);byPage.get(r.page).push(r);}
 for(const regions of byName.values())regions.sort((a,b)=>a.page-b.page||a.local_region_index-b.local_region_index||a.record-b.record);
 for(const regions of byPage.values())regions.sort((a,b)=>b.rect_normalized[2]*b.rect_normalized[3]-a.rect_normalized[2]*a.rect_normalized[3]);
 for(const p of pages){const shell=document.createElement('section');shell.className='schema-page';shell.setAttribute('aria-label','Página '+p.page);shell.dataset.page=p.page;const placeholder=document.createElement('div');placeholder.className='page-placeholder';placeholder.textContent='Página '+p.page;shell.append(placeholder);shells.set(p.page,shell);stack.append(shell);}
 const pageData=n=>pages.find(p=>p.page===n)||pages[0];
 const entry=n=>state.layout.find(p=>p.page===n);
 function anchor(){const y=viewer.scrollTop+viewer.clientHeight/2,x=viewer.scrollLeft+viewer.clientWidth/2;const p=state.layout.find(p=>y<p.top+p.height)||state.layout.at(-1);return p?{page:p.page,x:(x-p.left)/state.zoom,y:(y-p.top)/state.zoom}:null;}
 function restore(a){if(!a)return;const p=entry(a.page);if(!p)return;viewer.scrollTop=clamp(p.top+a.y*state.zoom-viewer.clientHeight/2,0,Math.max(0,state.height-viewer.clientHeight));viewer.scrollLeft=clamp(p.left+a.x*state.zoom-viewer.clientWidth/2,0,Math.max(0,state.width-viewer.clientWidth));}
 function fitScale(){const p=pageData(state.page),w=Math.max(40,viewer.clientWidth-24)/p.width,h=Math.max(40,viewer.clientHeight-24)/p.height;return state.fit==='page'?Math.min(w,h):w;}
 function layout(a){
  if(!viewer.clientWidth||!viewer.clientHeight)return;
  const gap=14;state.width=Math.max(viewer.clientWidth,Math.max(...pages.map(p=>p.width))*state.zoom+24);let top=12;
  state.layout=pages.map(p=>{const width=p.width*state.zoom,height=p.height*state.zoom,left=(state.width-width)/2;const shell=shells.get(p.page);Object.assign(shell.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});const row={page:p.page,top,left,width,height};top+=height+gap;return row;});
  state.height=top-2+Math.max(0,viewer.clientHeight-state.layout.at(-1).height);stack.style.width=state.width+'px';stack.style.height=state.height+'px';restore(a);$('fitDocument').setAttribute('aria-pressed',String(!!state.fit));refresh();
 }
 function limitZoom(value){const p=pageData(state.page),fit=Math.min(Math.max(40,viewer.clientWidth-24)/p.width,Math.max(40,viewer.clientHeight-24)/p.height);return clamp(value,Math.min(fit*.5,2.4),Math.max(fit,2.4));}
 function setZoom(value,a=anchor()){state.fit=null;state.zoom=limitZoom(value);layout(a);}
 function chooseFit(mode){const a=anchor();state.fit=mode;state.zoom=fitScale();layout(a);}
 function mount(p){
  const shell=shells.get(p.page),meta=pageData(p.page);const surface=window.JCIDPdfPages.create(p.page,p.width,()=>{if(mounted.get(p.page)?.surface!==surface)return;const el=document.createElement('div');el.className='page-placeholder page-error';el.textContent='Não foi possível abrir esta página. Use o botão PDF.';shell.append(el);});const img=surface.element;
  const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 '+meta.width+' '+meta.height);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-label','Componentes da página '+p.page);
  const regions=new Map();
  for(const r of byPage.get(p.page)||[]){const [x,y,w,h]=r.rect_normalized,rect=document.createElementNS(svgNS,'rect');rect.setAttribute('x',x*meta.width);rect.setAttribute('y',y*meta.height);rect.setAttribute('width',w*meta.width);rect.setAttribute('height',h*meta.height);rect.setAttribute('class','region'+(state.name===r.identifier.toUpperCase()?' selected':''));rect.setAttribute('role','button');rect.setAttribute('tabindex','0');rect.setAttribute('aria-label',r.identifier+' · Página '+r.page);const title=document.createElementNS(svgNS,'title');title.textContent=r.identifier;rect.append(title);rect.addEventListener('click',()=>{if(!suppressClick)selectRecord(r,false,true);});rect.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRecord(r,false,true);}});regions.set(r.record,rect);svg.append(rect);}
  shell.append(img,svg);mounted.set(p.page,{img,svg,regions,surface});
 }
 function unmount(number){mounted.get(number)?.surface.destroy();const shell=shells.get(number);shell.replaceChildren();const placeholder=document.createElement('div');placeholder.className='page-placeholder';placeholder.textContent='Página '+number;shell.append(placeholder);mounted.delete(number);}
 function refresh(){
  raf=0;if(!state.layout.length||!viewer.clientHeight)return;
  const start=viewer.scrollTop-viewer.clientHeight*.75,end=viewer.scrollTop+viewer.clientHeight*1.75,visible=state.layout.filter(p=>p.top+p.height>=start&&p.top<=end),wanted=new Set(visible.map(p=>p.page));
  for(const n of mounted.keys())if(!wanted.has(n))unmount(n);for(const p of visible){if(!mounted.has(p.page))mount(p);else mounted.get(p.page).surface.resize(p.width);}
  const nearTop=viewer.scrollTop+18,current=state.layout.find(p=>nearTop<p.top+p.height)||state.layout.at(-1);state.page=current.page;
  if(document.activeElement!==$('pageNumber'))$('pageNumber').value=state.page;$('previousPage').disabled=state.page===pages[0].page;$('nextPage').disabled=state.page===pages.at(-1).page;$('originalPdf').href=doc.pdf+'#page='+state.page;
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(refresh);}
 function highlight(){for(const [n,m] of mounted)for(const r of byPage.get(n)||[])m.regions.get(r.record).setAttribute('class','region'+(state.name===r.identifier.toUpperCase()?' selected':''));}
 function occurrenceRows(){return state.searchMatches||(byName.get(state.name)||[]);}
 function fillOccurrences(){const choices=occurrenceRows(),select=$('occurrences');select.replaceChildren();if(!state.selected||!choices.length){const o=document.createElement('option');o.value='';o.textContent=choices.length?'Escolha…':'Ocorrências';select.append(o);}for(const r of choices){const o=document.createElement('option');o.value=r.record;o.textContent=r.identifier+' · p. '+r.page;o.title=(r.marker_tokens||[r.identifier]).join(' / ');select.append(o);}select.disabled=!choices.length;if(state.selected)select.value=state.selected.record;select.title=state.selected?state.selected.identifier+' · Página '+state.selected.page:'Resultados da busca';}
 function searchComponents(){
  const value=$('componentQuery').value.trim();state.searchMatches=null;
  if($('searchExact').checked||!value)return selectName(value||null);
  const name=value.toUpperCase(),names=[...byName.keys()].filter(n=>n.includes(name)).sort((a,b)=>Number(b===name)-Number(a===name)||a.localeCompare(b,undefined,{numeric:true}));
  if(!names.length)return selectName(value);
  state.searchMatches=names.flatMap(n=>byName.get(n));
  if(names.length===1){selectRecord(state.searchMatches[0],true,true,true);return;}
  state.name='';state.selected=null;pending=null;highlight();fillOccurrences();$('focusRegion').disabled=true;$('viewerStatus').textContent='Escolha o componente na lista de ocorrências.';
 }
 function focusRecord(r){
  if(!viewer.clientWidth||!viewer.clientHeight){pending=r;return;}
  const meta=pageData(r.page),[x,y,w,h]=r.rect_normalized;state.page=r.page;const scale=Math.min(viewer.clientWidth*.65/(w*meta.width),viewer.clientHeight*.45/(h*meta.height),2.2);
  state.fit=null;state.zoom=limitZoom(Math.max(state.zoom,Math.min(scale,.72)));layout();restore({page:r.page,x:(x+w/2)*meta.width,y:(y+h/2)*meta.height});refresh();
 }
 function selectRecord(r,focus=true,notify=true,keepResults=false){
  if(!keepResults)state.searchMatches=null;
  state.selected=r;state.name=r.identifier.toUpperCase();$('componentQuery').value=r.identifier;fillOccurrences();highlight();$('focusRegion').disabled=false;$('viewerStatus').textContent=r.identifier+' · Página '+r.page;if(focus)focusRecord(r);if(notify&&canSync)send('selected',{component:r.identifier,page:r.page});
 }
 function selectName(value,notify=true){
  state.searchMatches=null;
  if(value===null){state.name='';state.selected=null;pending=null;highlight();fillOccurrences();$('componentQuery').value='';$('focusRegion').disabled=true;$('viewerStatus').textContent='Arraste para mover · roda para ampliar.';return true;}
  const name=String(value||'').trim().toUpperCase(),matches=byName.get(name);if(!matches?.length){state.name='';state.selected=null;pending=null;highlight();fillOccurrences();$('focusRegion').disabled=true;$('componentQuery').value=name;$('viewerStatus').textContent='Sem posição no esquema para '+name;send('missing',{component:name});return false;}
  const r=matches.find(r=>r.page===state.page)||matches[0];selectRecord(r,true,notify);if(!notify)send('located',{component:r.identifier,page:r.page});return true;
 }
 function gotoPage(value){const number=clamp(Math.round(Number(value)||1),1,pages.length),page=pageData(number).page;state.page=page;if(state.fit){state.zoom=fitScale();layout();}const p=entry(page);if(p){viewer.scrollTop=p.top-10;refresh();}$('pageNumber').value=state.page;}
 $('componentSearch').addEventListener('submit',e=>{e.preventDefault();searchComponents();});
 $('occurrences').addEventListener('change',()=>{const r=occurrenceRows().find(r=>String(r.record)===$('occurrences').value);if(r)selectRecord(r,true,true,true);});
 $('pageNumber').max=pages.length;$('pageTotal').textContent='/ '+pages.length;$('pageNumber').addEventListener('change',()=>gotoPage($('pageNumber').value));$('pageNumber').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();gotoPage($('pageNumber').value);viewer.focus();}});
 $('previousPage').addEventListener('click',()=>gotoPage(state.page-1));$('nextPage').addEventListener('click',()=>gotoPage(state.page+1));$('fitDocument').addEventListener('click',()=>chooseFit('width'));$('focusRegion').addEventListener('click',()=>{if(state.selected)focusRecord(state.selected);});
 $('dockViewer').addEventListener('click',()=>send('dock'));
 viewer.addEventListener('scroll',schedule,{passive:true});
 viewer.addEventListener('wheel',e=>{e.preventDefault();const box=viewer.getBoundingClientRect(),sx=e.clientX-box.left,sy=e.clientY-box.top,pointY=viewer.scrollTop+sy,p=state.layout.find(p=>pointY<p.top+p.height)||state.layout.at(-1);if(!p)return;const px=(viewer.scrollLeft+sx-p.left)/state.zoom,py=(pointY-p.top)/state.zoom;setZoom(state.zoom*Math.exp(-clamp(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewer.clientHeight:1),-600,600)*.002),null);const next=entry(p.page);viewer.scrollLeft=next.left+px*state.zoom-sx;viewer.scrollTop=next.top+py*state.zoom-sy;schedule();},{passive:false});
 viewer.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;suppressClick=false;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewer.scrollLeft,top:viewer.scrollTop,moved:false};viewer.focus({preventScroll:true});});
 viewer.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4){drag.moved=true;viewer.setPointerCapture(e.pointerId);viewer.classList.add('panning');}if(drag.moved){viewer.scrollLeft=drag.left+drag.x-e.clientX;viewer.scrollTop=drag.top+drag.y-e.clientY;schedule();}});
 function endPan(){if(!drag)return;const d=drag;drag=null;suppressClick=d.moved;if(viewer.hasPointerCapture(d.id))viewer.releasePointerCapture(d.id);viewer.classList.remove('panning');if(suppressClick)setTimeout(()=>{suppressClick=false;},0);}
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])viewer.addEventListener(ev,endPan);
 function resize(){if(!viewer.clientWidth||!viewer.clientHeight)return;const a=anchor();if(state.fit)state.zoom=fitScale();else state.zoom=limitZoom(state.zoom);layout(a);if(pending){const r=pending;pending=null;focusRecord(r);}}
 new ResizeObserver(resize).observe(viewer);
 viewer.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(state.zoom*1.25);}else if(e.key==='-'){e.preventDefault();setZoom(state.zoom/1.25);}else if(e.key==='0'){e.preventDefault();chooseFit('width');}else if(e.key.toLowerCase()==='f'&&state.selected){e.preventDefault();focusRecord(state.selected);}});
 window.addEventListener('message',e=>{if(!host||e.source!==host||e.origin!==origin)return;const m=e.data;if(m?.channel!=='jcid-workbench'||m.schematicId!==context.schematicId||m.boardId!==context.boardId||m.session!==context.session)return;if(m.type==='resize')resize();if(m.type==='select'&&(m.component===null||canSync&&typeof m.component==='string'&&m.component.length<=128))selectName(m.component,false);});
 if(!D.regions.length){$('componentQuery').disabled=true;$('componentQuery').placeholder=doc.type==='reference'?'Documento de referência':'PDF sem índice de componentes';$('searchExact').disabled=true;}
 resize();if(canSync&&query.get('componente'))selectName(query.get('componente'),false);send('ready');
})();
