(() => {
 'use strict';
 const $=id=>document.getElementById(id),board=window.JCIDBoardView,pane=$('netcolorPane'),button=$('netcolorTool'),dialog=$('netcolorColorDialog');
 if(!board||!pane)return;
 const checked=new Set(),palette=['#ff0000','#ff6600','#ffff00','#00ff00','#00ffff','#0066ff','#0000ff','#9900ff','#ff00ff','#ff0066','#009900','#008080','#800000','#000080','#ffffff','#000000'];
 const randomPalette=palette.filter(c=>!['#ffff00','#ffffff','#000000','#800000','#000080'].includes(c));
 let boardKey=null,anchor=null,colorTargets=[];
 const active=()=>!document.body.classList.contains('source-mode')&&!document.body.classList.contains('board-loading');
 const validColor=c=>/^#[0-9a-f]{6}$/i.test(c);
 function selected(){if(!active())return null;const id=board.getState().net;return window.JCID_BOARD.nets.find(n=>n.id===id)||null;}
 function open(){board.openTools();pane.hidden=false;button.setAttribute('aria-pressed','true');button.setAttribute('aria-expanded','true');window.dispatchEvent(new CustomEvent('jcid:tool',{detail:'netcolor'}));refresh();}
 function close(){pane.hidden=true;button.setAttribute('aria-pressed','false');button.setAttribute('aria-expanded','false');}
 function nextColor(){
  const used=new Set(board.getNetColors().map(n=>n.color.toLowerCase())),free=randomPalette.filter(c=>!used.has(c));
  if(free.length)return free[Math.floor(Math.random()*free.length)];
  // Saturated hues, excluding the yellow sector (35–85 degrees).
  let color,attempts=0;do{const pick=Math.random()*310,hue=pick<35?pick:pick+50,h=hue/60,i=Math.floor(h),f=h-i,v=++attempts>12?.88+Math.random()*.12:1,p=attempts>12?Math.random()*.08:0,q=v-(v-p)*f,t=p+(v-p)*f;
   const rgb=[[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i];
   color='#'+rgb.map(c=>Math.round(c*255).toString(16).padStart(2,'0')).join('');
  }while(used.has(color)&&attempts<128);return color;
 }
 function add(){const net=selected();if(!net)return false;if(!board.getNetColors().some(n=>n.id===net.id)&&!board.setNetColor(net.id,nextColor()))return false;open();return true;}
 function refreshActions(){
  const rows=board.getNetColors(),hasChecked=rows.some(n=>checked.has(n.id));
  $('netcolorAll').checked=!!rows.length&&rows.every(n=>checked.has(n.id));$('netcolorAll').indeterminate=hasChecked&&!$('netcolorAll').checked;
  $('netcolorAll').disabled=!rows.length;$('netcolorRemove').disabled=!hasChecked;$('netcolorClear').disabled=!rows.length;$('netcolorCustom').disabled=!hasChecked;
  $('netcolorIsolate').disabled=!rows.length||!active();$('netcolorIsolate').setAttribute('aria-pressed',String(board.isNetColorIsolated()));
  for(const swatch of $('netcolorPalette').children)swatch.disabled=!hasChecked;
 }
 function reflectChecked(){for(const line of $('netcolorList').children){const input=line.querySelector('input');if(!input)continue;const yes=checked.has(Number(input.dataset.net));input.checked=yes;line.classList.toggle('is-checked',yes);}refreshActions();}
 function mark(id,e){
  const ids=board.getNetColors().map(n=>n.id),index=ids.indexOf(id),start=ids.indexOf(anchor),multiple=e.ctrlKey||e.metaKey;
  if(e.shiftKey&&start>=0){if(!multiple)checked.clear();for(let i=Math.min(start,index);i<=Math.max(start,index);i++)checked.add(ids[i]);}
  else if(multiple){checked.has(id)?checked.delete(id):checked.add(id);anchor=id;}
  else{const turnOff=checked.size===1&&checked.has(id);checked.clear();if(!turnOff)checked.add(id);anchor=id;}
  reflectChecked();
 }
 function applyColor(ids,color){if(validColor(color))board.recolorNetColors(ids,color.toLowerCase());}
 function refresh(){
  const rows=board.getNetColors(),ids=new Set(rows.map(n=>n.id));for(const id of checked)if(!ids.has(id))checked.delete(id);if(!ids.has(anchor))anchor=null;
  const net=selected();$('netcolorCurrent').textContent=net?.name||'Selecione uma linha na placa';$('netcolorCurrent').title=net?.name||'';$('netcolorAdd').disabled=!net;
  const focused=document.activeElement?.dataset?.net,fragment=document.createDocumentFragment();
  for(const row of rows){
   const line=document.createElement('div');line.className='netcolor-row';line.classList.toggle('is-checked',checked.has(row.id));
   const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=checked.has(row.id);checkbox.dataset.net=String(row.id);checkbox.setAttribute('aria-label','Marcar '+row.name);checkbox.title='Clique: uma linha · Ctrl: várias · Shift: intervalo';
   checkbox.addEventListener('click',e=>mark(row.id,e));
   const name=document.createElement('button');name.type='button';name.className='netcolor-name';name.title=row.name;name.textContent=row.name;name.style.setProperty('--net-color',row.color);name.setAttribute('aria-label','Selecionar linha '+row.name);name.addEventListener('click',()=>{if(active())board.selectNet(row.id);});
   line.append(checkbox,name);fragment.append(line);
  }
  if(!rows.length){const empty=document.createElement('p');empty.className='netcolor-empty';empty.textContent='Selecione uma linha e use Adicionar ou a tecla A.';fragment.append(empty);}
  const scroll=$('netcolorList').scrollTop;$('netcolorList').replaceChildren(fragment);$('netcolorList').scrollTop=scroll;
  if(focused!==undefined)$('netcolorList').querySelector('[data-net="'+focused+'"]')?.focus({preventScroll:true});refreshActions();
 }
 for(const color of palette){const swatch=document.createElement('button');swatch.type='button';swatch.className='netcolor-swatch';swatch.style.background=color;swatch.title='Aplicar '+color;swatch.setAttribute('aria-label','Aplicar cor '+color+' às linhas marcadas');swatch.disabled=true;swatch.addEventListener('click',()=>applyColor([...checked],color));$('netcolorPalette').append(swatch);}
 function isolate(){if(!active()||!board.getNetColors().length)return false;board.setNetColorIsolation(!board.isNetColorIsolated());return true;}
 button.addEventListener('click',()=>pane.hidden?open():close());$('netcolorAdd').addEventListener('click',add);$('netcolorIsolate').addEventListener('click',isolate);
 $('netcolorAll').addEventListener('change',()=>{checked.clear();if($('netcolorAll').checked)for(const row of board.getNetColors())checked.add(row.id);reflectChecked();});
 $('netcolorRemove').addEventListener('click',()=>{board.removeNetColors([...checked]);checked.clear();refresh();});$('netcolorClear').addEventListener('click',()=>{board.clearNetColors();checked.clear();anchor=null;refresh();});
 $('netcolorCustom').addEventListener('click',()=>{colorTargets=[...checked];if(!colorTargets.length)return;const ids=[...colorTargets],current=board.getNetColors().find(n=>checked.has(n.id))?.color||'#ff0000';window.JCIDColorDialog.open(current,color=>applyColor(ids,color));});
 document.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(!['a','s'].includes(key)||e.repeat||e.ctrlKey||e.altKey||e.metaKey||!active()||$('appearanceDialog').open||$('nexusFilesDialog')?.open||dialog.open)return;const t=e.target,typing=t?.tagName==='INPUT'&&!t.readOnly&&!['checkbox','radio','button','submit','reset','range'].includes(t.type);if(t?.isContentEditable||t?.tagName==='TEXTAREA'||t?.tagName==='SELECT'||typing)return;if(key==='a'?add():isolate())e.preventDefault();});
 window.addEventListener('jcid:tool',e=>{if(e.detail!=='netcolor')close();});window.addEventListener('jcid:netcolors',refresh);window.addEventListener('jcid:selection',refresh);window.addEventListener('jcid:document',refresh);window.addEventListener('jcid:boardchange',e=>{if(boardKey!==e.detail?.id){checked.clear();anchor=null;colorTargets=[];boardKey=e.detail?.id;if(dialog.open)window.JCIDColorDialog.close();}refresh();});
 window.addEventListener('jcid:boardloadstate',refresh);refresh();
})();
