(async () => {
 'use strict';
 await (window.NexusReady||Promise.resolve());
 const $=id=>document.getElementById(id),board=window.JCIDBoardView;
 if(!board)return;
 const models=[...(window.JCID_DEVICES?.models||[])].reverse(),expanded=new Set(['iphone-11']),openedTabs=[],maxTabs=8;
 let activeModel='iphone-11',activeItem=null,sourceMode=false,activation=0;
 const pane=$('schematicPane');
 
 const icon=(className)=>{const s=document.createElement('span');s.className=className;s.setAttribute('aria-hidden','true');return s;};

 const legacy=m=>/^iphone-(?:[678](?:s)?(?:-|$)|x(?:r|s)?(?:-|$))/.test(m.id);
 function fileIcon(item){
  const id=item.id||'',type=item.viewer,kind=/camera/.test(id)?'camera':/receiver/.test(id)?'speaker':/dock/.test(id)?'connector':/wifi_chip|dot_projector/.test(id)?'chip':type==='schematic'||/schematic|diagnostic/.test(id)?'schematic':type==='image'||item.kind==='board_image'||/image/.test(id)?'image':item.interactive_map_ready||/motherboard/.test(id)?'board':'document';
  const shapes={board:[['rect',{x:3,y:4,width:18,height:16,rx:2}],['rect',{x:8,y:8,width:7,height:7,rx:1}],['path',{d:'M5 8h3m7 2h4M11 5v3m0 7v4m-5-4h2m7 1h4'}]],schematic:[['path',{d:'M5 2h10l4 4v16H5ZM15 2v5h4M7 13h3l1-3 2 6 1-3h3'}]],image:[['rect',{x:3,y:3,width:18,height:18,rx:2}],['circle',{cx:8,cy:8,r:2}],['path',{d:'m3 18 6-6 4 4 3-3 5 5'}]],camera:[['path',{d:'M3 7h4l2-3h6l2 3h4v13H3Z'}],['circle',{cx:12,cy:13,r:4}]],speaker:[['path',{d:'M4 9h4l5-4v14l-5-4H4Zm12-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14'}]],connector:[['rect',{x:3,y:7,width:18,height:11,rx:2}],['path',{d:'M7 7V4m5 3V4m5 3V4M7 11v3m5-3v3m5-3v3M8 18v3m8-3v3'}]],chip:[['rect',{x:6,y:6,width:12,height:12,rx:1}],['path',{d:'M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4'}]],document:[['path',{d:'M5 2h10l4 4v16H5ZM15 2v5h4M8 11h8m-8 4h8m-8 4h5'}]]};
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','file-icon file-icon-'+kind);svg.setAttribute('aria-hidden','true');for(const [tag,attrs] of shapes[kind]){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));svg.append(el);}return svg;
 }
 function setSourceMode(value){sourceMode=value;document.body.classList.toggle('source-mode',value);$('sourcePlaceholder').hidden=!value;$('assetPane').hidden=true;for(const group of document.querySelectorAll('.board-controls'))group.inert=value;$('boardCanvas').tabIndex=value?-1:0;if(value){pane.hidden=true;}else board.redraw();}
 function openItem(model,item){
  if(!openedTabs.some(t=>t.item.id===item.id)){if(openedTabs.length>=maxTabs){$('tabLimitMessage').hidden=false;return Promise.resolve(false);}openedTabs.push({model,item});}
  $('tabLimitMessage').hidden=true;
  return activateItem(model,item);
 }
 async function activateItem(model,item){
  const token=++activation;
  if(item.interactive_map_ready&&window.JCIDBoards){try{if(!await window.JCIDBoards.load(item,model)||token!==activation)return;}catch(error){if(token!==activation)return;const message=$('searchError');message.textContent=error.message;message.hidden=false;renderDevices();renderTabs();return;}}else window.JCIDBoards?.cancel();
  let schematic=null,linkedBoard=null;
  if(item.viewer==='schematic'){
   schematic=(window.JCID_SCHEMATICS?.documents||[]).find(d=>d.id===(item.schematic_id||item.id));
   if(!schematic){$('searchError').textContent='Esquemático ainda não disponível.';$('searchError').hidden=false;return;}
   linkedBoard=model.children.find(c=>c.id===window.JCIDBoards.current()&&schematic.board_ids.includes(c.id))||model.children.find(c=>c.interactive_map_ready&&schematic.board_ids.includes(c.id));
   if(linkedBoard){try{if(!await window.JCIDBoards.load(linkedBoard,model)||token!==activation)return;}catch(error){$('searchError').textContent=error.message;$('searchError').hidden=false;return;}}
  }
  
  activeModel=model.id;activeItem=item.id;expanded.add(model.id);if(item.group)expanded.add(model.id+'-'+item.group);if(legacy(model)){expanded.add('legacy');expanded.add(model.id);}$('sourcePreparation').hidden=false;$('sourcePreparation').textContent=item.preparation_note||'Este item ainda precisa ser preparado para visualização.';document.title=model.label+' · '+item.label+' · NEXUS MOBILE';
  if(item.interactive_map_ready){setSourceMode(false);window.JCIDSchematic.activateBoard();}
  else if(item.viewer==='schematic'){setSourceMode(!linkedBoard);if(!linkedBoard){$('sourceName').textContent=model.label+' · '+item.label;$('sourceDescription').textContent='Esquemático disponível na ferramenta ao lado.';$('sourceTypes').replaceChildren();$('sourceFilesDetails').hidden=true;$('sourceQualifier').hidden=true;$('sourcePreparation').hidden=true;}window.JCIDSchematic.open(schematic.id,model.id);}
  else if(item.preview){
   setSourceMode(true);$('sourcePlaceholder').hidden=true;$('assetPane').hidden=false;$('assetTitle').textContent=model.label+' · '+item.label;
   const image=item.viewer==='image';$('assetImage').hidden=!image;$('assetDocument').hidden=image;$('assetSize').hidden=!image;
   if(image){$('assetImage').src=item.preview;$('assetImage').alt=item.label+' — '+model.label;$('assetImage').classList.remove('natural');$('assetSize').setAttribute('aria-pressed','false');}
   else $('assetDocument').src=item.preview;
   $('assetExternal').href=item.original||item.preview;
  }
  else{
   setSourceMode(true);$('sourceName').textContent=model.label+' · '+item.label;
   $('sourceDescription').textContent='Fontes disponíveis para este item.';
   const list=document.createDocumentFragment();
   for(const type of item.types||[]){const li=document.createElement('li');li.textContent=typeof type==='string'?type:type.label;list.append(li);}
   $('sourceTypes').replaceChildren(list);$('sourceFiles').replaceChildren();
   for(const path of (item.files||[]).slice(0,8)){const li=document.createElement('li');li.textContent=typeof path==='string'?path.split('/').pop():path.name||path.path?.split('/').pop()||'';if(li.textContent)$('sourceFiles').append(li);}
   $('sourceFilesDetails').hidden=!$('sourceFiles').childElementCount;
   $('sourceQualifier').textContent=model.label_qualifier||'';$('sourceQualifier').hidden=!model.label_qualifier;
  }
  if(matchMedia('(max-width:900px)').matches&&item.viewer!=='schematic')board.closePanels();
  renderDevices();renderTabs();window.dispatchEvent(new CustomEvent('jcid:document',{detail:{model:activeModel,item:activeItem}}));
 }
 function closeTab(id){
  const i=openedTabs.findIndex(t=>t.item.id===id);if(i<0)return;openedTabs.splice(i,1);window.JCIDBoards?.forget(id);
  $('tabLimitMessage').hidden=true;
  if(id===activeItem){activation++;window.JCIDBoards?.cancel();const next=openedTabs[Math.min(i,openedTabs.length-1)];if(next){activateItem(next.model,next.item);return;}
   activeItem=null;activeModel=null;setSourceMode(true);$('sourceName').textContent='Nenhuma aba aberta';$('sourceDescription').textContent='Escolha uma placa ou um documento na lista de aparelhos.';$('sourceTypes').replaceChildren();$('sourceFilesDetails').hidden=true;$('sourceQualifier').hidden=true;$('sourcePreparation').hidden=true;document.title='NEXUS MOBILE';
  }
  renderDevices();renderTabs();window.dispatchEvent(new CustomEvent('jcid:document',{detail:{model:activeModel,item:activeItem}}));
 }
 function renderTabs(){
  const frag=document.createDocumentFragment();
  for(const {model,item} of openedTabs){
   const tab=document.createElement('div');tab.className='document-tab'+(item.id===activeItem?' active':'');tab.setAttribute('role','presentation');
   const b=document.createElement('button');b.type='button';b.className='tab-select';b.id='tab-'+item.id;b.setAttribute('role','tab');b.setAttribute('aria-controls','documentPanel');b.setAttribute('aria-selected',String(item.id===activeItem));b.tabIndex=item.id===activeItem?0:-1;b.title=model.label+' · '+item.label;b.textContent=model.label+' · '+item.label;
   b.addEventListener('click',()=>activateItem(model,item));b.addEventListener('keydown',e=>{if(e.ctrlKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))return;const i=openedTabs.findIndex(t=>t.item.id===item.id);let next;if(e.key==='ArrowRight')next=openedTabs[(i+1)%openedTabs.length];if(e.key==='ArrowLeft')next=openedTabs[(i-1+openedTabs.length)%openedTabs.length];if(e.key==='Home')next=openedTabs[0];if(e.key==='End')next=openedTabs.at(-1);if(e.key==='Delete'){e.preventDefault();closeTab(item.id);return;}if(next){e.preventDefault();activateItem(next.model,next.item);$('tab-'+next.item.id)?.focus();}});
   const close=document.createElement('button');close.type='button';close.className='tab-close';close.textContent='×';close.setAttribute('aria-label','Fechar '+model.label+' · '+item.label);close.addEventListener('click',()=>closeTab(item.id));tab.append(b,close);frag.append(tab);
  }
  $('documentTabs').replaceChildren(frag);if(activeItem){$('documentPanel').setAttribute('aria-labelledby','tab-'+activeItem);$('tab-'+activeItem)?.scrollIntoView({block:'nearest',inline:'nearest'});}else $('documentPanel').removeAttribute('aria-labelledby');
 }
 function renderDevices(){
  const q=$('deviceSearch').value.trim().toLocaleLowerCase('pt-BR'),fragment=document.createDocumentFragment(),oldModels=document.createDocumentFragment();let count=0,oldCount=0;
  for(const model of models){
   const items=model.children||[],matchesModel=model.label.toLocaleLowerCase('pt-BR').includes(q);
   const children=q&&!matchesModel?items.filter(c=>(c.label+' '+(c.groupLabel||'')).toLocaleLowerCase('pt-BR').includes(q)):items;
   if(q&&!matchesModel&&!children.length)continue;count++;
   const group=document.createElement('div');group.className='device-folder';group.dataset.model=model.id;
   const folder=document.createElement('button');folder.type='button';folder.className='folder-button';const open=expanded.has(model.id)||!!q;
   folder.setAttribute('aria-expanded',String(open));folder.setAttribute('aria-controls','folder-'+model.id);folder.dataset.folder=model.id;folder.title=model.label;
   const expand=document.createElement('span');expand.className='folder-expand';expand.textContent=open?'−':'+';expand.setAttribute('aria-hidden','true');
   const text=document.createElement('span');text.className='folder-label';text.textContent=model.label;
   folder.append(expand,icon('folder-glyph'),text);
   if(model.label_qualifier)folder.title=model.label_qualifier;
   folder.addEventListener('click',()=>{expanded.has(model.id)?expanded.delete(model.id):expanded.add(model.id);if(q)$('deviceSearch').value='';renderDevices();$('deviceList').querySelector('[data-folder="'+model.id+'"]')?.focus({preventScroll:true});});
   group.append(folder);
   const sub=document.createElement('div');sub.id='folder-'+model.id;sub.className='device-children';sub.hidden=!open;
   const makeChild=item=>{const b=document.createElement('button');b.type='button';b.className='device-child';b.setAttribute('aria-current',String(activeModel===model.id&&activeItem===item.id));
    const label=document.createElement('span');label.className='child-text';const name=document.createElement('span');name.textContent=item.label;const availability=document.createElement('small');availability.textContent=item.interactive_map_ready?'Mapa disponível':item.viewer==='schematic'?'Esquema disponível':item.group==='eagle_team_zone'?'Referência Eagle Team':item.preview?'Prévia disponível':'Fontes reunidas';label.append(name,availability);b.title=item.label+' · '+availability.textContent;b.setAttribute('aria-label',b.title);
    b.append(fileIcon(item),label);b.addEventListener('click',()=>openItem(model,item));return b;};
   for(const item of children.filter(i=>!i.group))sub.append(makeChild(item));
   for(const key of new Set(children.map(i=>i.group).filter(Boolean))){
    const members=children.filter(i=>i.group===key),id=model.id+'-'+key,opened=expanded.has(id)||!!q,group=document.createElement('div');group.className='device-subfolder';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='folder-button';toggle.dataset.folder=id;toggle.setAttribute('aria-expanded',String(opened));toggle.setAttribute('aria-controls','folder-'+id);
    const sign=document.createElement('span');sign.className='folder-expand';sign.textContent=opened?'−':'+';sign.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='folder-label';label.textContent=members[0].groupLabel||key;
    toggle.append(sign,icon('folder-glyph'),label);toggle.addEventListener('click',()=>{expanded.has(id)?expanded.delete(id):expanded.add(id);if(q)$('deviceSearch').value='';renderDevices();$('deviceList').querySelector('[data-folder="'+id+'"]')?.focus({preventScroll:true});});
    const content=document.createElement('div');content.className='device-children';content.id='folder-'+id;content.hidden=!opened;for(const item of members)content.append(makeChild(item));group.append(toggle,content);sub.append(group);
   }
   if(!children.length){const empty=document.createElement('p');empty.className='empty-list';empty.textContent='Nenhum item identificado.';sub.append(empty);}
   group.append(sub);if(legacy(model)){oldModels.append(group);oldCount++;}else fragment.append(group);
  }

  if(oldCount){const group=document.createElement('div');group.className='device-folder legacy-folder';const folder=document.createElement('button'),open=expanded.has('legacy')||!!q;folder.type='button';folder.className='folder-button';folder.dataset.folder='legacy';folder.setAttribute('aria-expanded',String(open));folder.setAttribute('aria-controls','folder-legacy');const expand=document.createElement('span');expand.className='folder-expand';expand.textContent=open?'−':'+';expand.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='folder-label';label.textContent='iPhones antigos';folder.append(expand,icon('folder-glyph'),label);folder.addEventListener('click',()=>{expanded.has('legacy')?expanded.delete('legacy'):expanded.add('legacy');if(q)$('deviceSearch').value='';renderDevices();$('deviceList').querySelector('[data-folder="legacy"]')?.focus({preventScroll:true});});const children=document.createElement('div');children.id='folder-legacy';children.className='legacy-children';children.hidden=!open;children.append(oldModels);group.append(folder,children);fragment.append(group);}
  if(!count){const p=document.createElement('p');p.className='empty-list';p.textContent='Nenhum aparelho ou item encontrado.';fragment.append(p);}
  const scroll=$('deviceList').scrollTop,horizontal=$('deviceList').scrollLeft;$('deviceList').replaceChildren(fragment);$('deviceList').scrollTop=scroll;$('deviceList').scrollLeft=horizontal;

 }
 window.addEventListener('nexus:library',()=>{
  models.splice(0,models.length,...[...(window.JCID_DEVICES?.models||[])].reverse());
  const previous=activeItem,remaining=[];for(const tab of openedTabs){const model=models.find(m=>m.id===tab.model.id),item=model?.children.find(i=>i.id===tab.item.id);if(item)remaining.push({model,item});else window.JCIDBoards?.forget(tab.item.id);}
  openedTabs.splice(0,openedTabs.length,...remaining);const current=openedTabs.find(t=>t.item.id===previous);
  if(current)activateItem(current.model,current.item);else if(openedTabs.length)activateItem(openedTabs[0].model,openedTabs[0].item);else{activeItem=null;activeModel=null;setSourceMode(true);$('sourceName').textContent='Escolha uma placa';$('sourceDescription').textContent='Abra um aparelho na lista.';$('sourcePreparation').hidden=true;$('sourceTypes').replaceChildren();$('sourceFilesDetails').hidden=true;$('sourceQualifier').hidden=true;}
  renderDevices();renderTabs();
 });
 $('deviceSearch').addEventListener('input',renderDevices);
 $('assetSize').addEventListener('click',()=>{$('assetSize').setAttribute('aria-pressed',String($('assetImage').classList.toggle('natural')));});
 $('returnToBoard').addEventListener('click',()=>{const m=models.find(m=>m.id==='iphone-11'),item=m?.children?.find(c=>c.interactive_map_ready);if(m&&item){expanded.add(m.id);openItem(m,item);}});
 const route=new URLSearchParams(location.search),requested=route.get('board'),initial=models.find(m=>m.children.some(i=>i.id===requested&&i.interactive_map_ready))||models.find(m=>m.id==='iphone-11'),initialItem=initial?.children?.find(c=>c.id===requested&&c.interactive_map_ready)||initial?.children?.find(c=>c.interactive_map_ready);
 if(initial&&initialItem){expanded.add(initial.id);openItem(initial,initialItem).then(()=>{if(route.get('componente')&&window.JCIDBoards.current()===initialItem.id)board.selectComponent(route.get('componente'));});}else renderDevices();
 window.JCIDDesktop=Object.freeze({openItem:(modelId,itemId)=>{const model=models.find(m=>m.id===modelId),item=model?.children.find(i=>i.id===itemId);if(!item)return Promise.resolve(false);return openItem(model,item);}});
})();
