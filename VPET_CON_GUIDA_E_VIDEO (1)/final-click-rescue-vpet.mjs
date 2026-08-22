import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');
const css=`<style id="VPET_FINAL_CLICK_RESCUE_20260822">
/* Final interaction rescue: hidden overlays must never block the dashboard */
.modal:not(.show){pointer-events:none!important;visibility:hidden!important}
.modal.show{pointer-events:auto!important;visibility:visible!important}
button,[role="button"],[onclick],.card,.toolCard{pointer-events:auto!important;touch-action:manipulation}
button,[role="button"]{cursor:pointer}
</style>`;
if(!s.includes('VPET_FINAL_CLICK_RESCUE_20260822')) s=s.replace('</head>',css+'</head>');
const js=`<script id="VPET_FINAL_CLICK_RESCUE_JS_20260822">(()=>{
const routes=[
 ['pet sos','sos'],['sos','sos'],['vicino a me','near'],['adozioni','adopt'],['adozione','adopt'],
 ['viaggia insieme','travel'],['viaggi','travel'],['pet culture','culture'],['animali nella storia','history'],
 ['eventi','events'],['guida alle razze','breeds'],['razze','breeds'],['salute & benessere','health'],
 ['salute e benessere','health']
];
function norm(v){return String(v||'').replace(/\\s+/g,' ').trim().toLowerCase()}
function routeFor(el){
 const raw=[el?.dataset?.key,el?.dataset?.section,el?.dataset?.target,el?.getAttribute?.('aria-label'),el?.textContent].map(norm).filter(Boolean);
 for(const txt of raw){for(const [label,key] of routes){if(txt===label||txt.includes(label)) return key}}
 const oc=el?.getAttribute?.('onclick')||''; const m=oc.match(/openM\\(['\"]([^'\"]+)['\"]\\)/); return m?.[1]||null;
}
function openKey(key){
 if(key==='breeds'&&typeof window.__vpetOpenRealBreeds==='function') return window.__vpetOpenRealBreeds();
 if(typeof window.openM==='function') return window.openM(key);
}
function wire(root=document){
 root.querySelectorAll('button,a,[role="button"],[onclick],.card,.toolCard').forEach(el=>{
   if(el.dataset.vpetClickRescue==='1')return;
   const key=routeFor(el); if(!key)return;
   el.dataset.vpetClickRescue='1';
   el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openKey(key)},{passive:false});
 });
}
window.addEventListener('DOMContentLoaded',()=>{
 wire();
 const m=document.getElementById('modal'); if(m&&!m.classList.contains('show')){m.setAttribute('aria-hidden','true')}
 new MutationObserver(()=>wire()).observe(document.body,{childList:true,subtree:true});
 setTimeout(wire,250);setTimeout(wire,900);
});
})();</script>`;
if(!s.includes('VPET_FINAL_CLICK_RESCUE_JS_20260822')) s=s.replace('</body>',js+'</body>');
await writeFile(p,s,'utf8');
console.log('VPET final click rescue applied');
