import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');
const js=`<script id="VPET_FORCE_BREEDS_FINAL_20260822">(()=>{
function openRealBreeds(){
  if(typeof window.vpetBreedHub==='function') return window.vpetBreedHub();
  if(typeof window.vpetMeticulousBreedHub==='function') return window.vpetMeticulousBreedHub();
}
const previousOpenM=window.openM;
window.openM=function(key){
  if(key==='breeds'||key==='breed'||key==='razze') return openRealBreeds();
  return typeof previousOpenM==='function'?previousOpenM.apply(this,arguments):undefined;
};
window.openM.__vpetForceBreedsFinal=true;
function bindBreedEntrances(root=document){
  const selectors=[
    '[onclick*="openM(\\\'breeds\\\')"]',
    '[onclick*="openM(\\\"breeds\\\")"]',
    '[data-key="breeds"]','[data-section="breeds"]','[data-target="breeds"]',
    '[aria-label*="Razze"]','[aria-label*="razze"]'
  ];
  root.querySelectorAll(selectors.join(',')).forEach(el=>{
    el.onclick=(e)=>{e?.preventDefault?.();e?.stopPropagation?.();openRealBreeds();};
  });
  root.querySelectorAll('button,a,[role="button"]').forEach(el=>{
    const t=(el.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase();
    if(t==='guida alle razze'||t.includes('guida alle razze')){
      el.onclick=(e)=>{e?.preventDefault?.();e?.stopPropagation?.();openRealBreeds();};
    }
  });
}
function verifyHub(){
  const sh=document.getElementById('sheet');
  if(!sh)return false;
  const t=(sh.textContent||'').toLowerCase();
  return t.includes('razze di gatti')&&t.includes('razze di cani');
}
window.__vpetOpenRealBreeds=openRealBreeds;
window.__vpetVerifyBreedHub=verifyHub;
window.addEventListener('DOMContentLoaded',()=>{
  bindBreedEntrances();
  const mo=new MutationObserver(()=>bindBreedEntrances());
  mo.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>bindBreedEntrances(),300);
  setTimeout(()=>bindBreedEntrances(),1000);
});
})();</script>`;
if(!s.includes('VPET_FORCE_BREEDS_FINAL_20260822'))s=s.replace('</body>',js+'</body>');
await writeFile(p,s,'utf8');
console.log('VPET final breed navigation force applied');
