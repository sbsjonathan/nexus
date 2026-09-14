(() => {
 'use strict';
 const $=id=>document.getElementById(id),workspace=$('workspace'),small=matchMedia('(max-width:900px)'),rail=32,gap=8;
 const min={left:150,right:150},handles={left:$('leftPanelResize'),right:$('rightPanelResize')};
 let widths={left:220,right:320},drag=null,pending=null,tick=0;
 try{const saved=JSON.parse(localStorage.getItem('jcid-panel-widths-v1'));for(const side of ['left','right'])if(Number.isFinite(saved?.[side]))widths[side]=Math.max(min[side],saved[side]);}catch{}
 const hidden=side=>workspace.classList.contains(side==='left'?'devices-hidden':'tools-hidden');
 const visible=side=>hidden(side)?rail:widths[side];
 const total=()=>workspace.getBoundingClientRect().width;
 const limit=side=>Math.max(min[side],total()-visible(side==='left'?'right':'left')-gap);
 function save(){try{localStorage.setItem('jcid-panel-widths-v1',JSON.stringify(widths));}catch{}}
 function render(){
  if(small.matches)return;
  const room=total()-gap;
  if(visible('left')+visible('right')>room){
   for(const side of ['right','left'])if(!hidden(side))widths[side]=Math.max(min[side],Math.min(widths[side],room-visible(side==='left'?'right':'left')));
  }
  workspace.style.setProperty('--left-panel',widths.left+'px');workspace.style.setProperty('--right-panel',widths.right+'px');
  handles.left.style.left=(visible('left')-3)+'px';handles.right.style.right=(visible('right')-3)+'px';
  for(const side of ['left','right']){const h=handles[side];h.hidden=hidden(side);h.setAttribute('aria-valuemin',String(min[side]));h.setAttribute('aria-valuemax',String(Math.round(limit(side))));h.setAttribute('aria-valuenow',String(Math.round(widths[side])));}
 }
 function resize(side,value){widths[side]=Math.round(Math.max(min[side],Math.min(limit(side),value)));render();}
 function applyPending(){tick=0;if(pending){resize(pending.side,pending.value);pending=null;}}
 function end(){if(!drag)return;applyPending();const d=drag;drag=null;const h=handles[d.side];if(h.hasPointerCapture(d.id))h.releasePointerCapture(d.id);h.classList.remove('dragging');workspace.classList.remove('panels-resizing');save();}
 for(const [side,h] of Object.entries(handles)){
  h.addEventListener('pointerdown',e=>{if(e.button!==0||small.matches)return;e.preventDefault();h.focus({preventScroll:true});drag={side,id:e.pointerId,x:e.clientX,width:widths[side]};h.setPointerCapture(e.pointerId);h.classList.add('dragging');workspace.classList.add('panels-resizing');});
  h.addEventListener('pointermove',e=>{if(!drag||drag.side!==side||drag.id!==e.pointerId)return;pending={side,value:drag.width+(e.clientX-drag.x)*(side==='left'?1:-1)};if(!tick)tick=requestAnimationFrame(applyPending);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])h.addEventListener(name,end);
  h.addEventListener('keydown',e=>{let value=widths[side],step=e.shiftKey?50:10;if(e.key==='ArrowLeft')value-=side==='left'?step:-step;else if(e.key==='ArrowRight')value+=side==='left'?step:-step;else if(e.key==='Home')value=min[side];else if(e.key==='End')value=limit(side);else return;e.preventDefault();e.stopPropagation();resize(side,value);save();});
 }
 new ResizeObserver(render).observe(workspace);window.addEventListener('jcid:panels',render);small.addEventListener('change',()=>{end();render();});render();
})();
