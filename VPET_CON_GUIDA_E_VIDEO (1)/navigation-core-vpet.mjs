import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');
const js=`<script id="VPET_NAV_CORE_20260822">(()=>{
function getModal(){return document.getElementById('modal')}
function getSheet(){return document.getElementById('sheet')}
window.closeM=function(){const m=getModal();if(m)m.classList.remove('show')}
window.openM=function(k){
  if(k==='breeds'||k==='breed'||k==='razze'){
    if(typeof window.vpetBreedHub==='function')return window.vpetBreedHub();
    if(typeof window.vpetMeticulousBreedHub==='function')return window.vpetMeticulousBreedHub();
  }
  const m=getModal(), sh=getSheet();
  if(!m||!sh)return;
  if(typeof D==='undefined'||!D[k])return;
  const sec=D[k];
  const items=(sec.items||[]).map((x,i)=>{
    const label=x[0];
    const action=(k==='culture'&&typeof CULTURE!=='undefined'&&CULTURE[label])?`cultureList('${String(label).replace(/'/g,"\\'")}')`:`detail('${k}',${i})`;
    return `<button type="button" onclick="${action}">${label}</button>`;
  }).join('');
  sh.innerHTML=`<h2>${sec.title}</h2><p class="lead">${sec.lead||''}</p><div class="grid">${items}</div><button class="close" type="button" onclick="closeM()">Chiudi</button>`;
  m.classList.add('show');
};
window.addEventListener('DOMContentLoaded',()=>{
  const m=getModal();if(m&&!m.classList.contains('show'))m.style.pointerEvents='none';
  const obs=new MutationObserver(()=>{const mm=getModal();if(!mm)return;mm.style.pointerEvents=mm.classList.contains('show')?'auto':'none';});
  if(m)obs.observe(m,{attributes:true,attributeFilter:['class']});
});
})();</script>`;
if(!s.includes('VPET_NAV_CORE_20260822'))s=s.replace('</body>',js+'</body>');
await writeFile(p,s,'utf8');
console.log('VPET navigation core applied');
