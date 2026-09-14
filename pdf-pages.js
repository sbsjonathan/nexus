(() => {
 'use strict';
 let loading;
 const base=new URL('.',document.currentScript.src);
 function documentReady(){
  if(!loading)loading=import(new URL('vendor/pdfjs/pdf.min.js',base).href).then(pdf=>{
   pdf.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.min.js',base).href;
   return pdf.getDocument({url:new URL(window.JCID_CURRENT_SCHEMATIC.pdf,base).href,standardFontDataUrl:new URL('vendor/pdfjs/standard_fonts/',base).href,cMapUrl:new URL('vendor/pdfjs/cmaps/',base).href,cMapPacked:true,iccUrl:new URL('vendor/pdfjs/iccs/',base).href,wasmUrl:new URL('vendor/pdfjs/wasm/',base).href,disableFontFace:true,useSystemFonts:false,isEvalSupported:false,verbosity:0}).promise;
  });
  return loading;
 }
 function create(number,width,onError){
  const element=document.createElement('canvas');element.setAttribute('aria-label',window.JCID_CURRENT_SCHEMATIC.title+', página '+number);element.setAttribute('role','img');
  let disposed=false,timer=0,generation=0,task=null,page=null,renderedWidth=0,wantedWidth=0;
  async function paint(ticket){
   try{
    const doc=await documentReady();if(disposed||ticket!==generation)return;
    page=await doc.getPage(number);if(disposed||ticket!==generation)return;
    if(task){const old=task;old.cancel();try{await old.promise;}catch{}if(disposed||ticket!==generation)return;}
    const native=page.getViewport({scale:1}),viewport=page.getViewport({scale:wantedWidth/native.width}),buffer=document.createElement('canvas');buffer.width=Math.ceil(viewport.width);buffer.height=Math.ceil(viewport.height);
    const render=page.render({canvas:buffer,canvasContext:buffer.getContext('2d'),viewport,background:'rgb(255,255,255)'});task=render;await render.promise;
    if(disposed||ticket!==generation)return;element.width=buffer.width;element.height=buffer.height;element.getContext('2d').drawImage(buffer,0,0);renderedWidth=wantedWidth;
   }catch(error){if(!disposed&&ticket===generation&&error.name!=='RenderingCancelledException')onError(error);}
  }
  function resize(displayWidth){const pixels=Math.max(160,Math.min(3000,Math.round(displayWidth*Math.min(2,devicePixelRatio||1))));if(pixels===wantedWidth||renderedWidth&&Math.abs(pixels-renderedWidth)/renderedWidth<.08)return;wantedWidth=pixels;generation++;clearTimeout(timer);timer=setTimeout(()=>paint(generation),100);}
  function destroy(){disposed=true;generation++;clearTimeout(timer);if(task)task.cancel();if(page){const held=page;Promise.resolve(task?.promise).catch(()=>{}).then(()=>held.cleanup());}element.width=element.height=1;}
  resize(width);return {element,resize,destroy};
 }
 window.JCIDPdfPages=Object.freeze({create});
})();
