import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');
const js=`<script id="VPET_MOBILE_BREED_DETAIL_20260823">(()=>{
function mobile(){return matchMedia('(max-width:700px)').matches}
function panel(){return document.getElementById('vpetMobilePanel')}
function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
const prev=window.vpetBreedDetail;
window.vpetBreedDetail=function(type,i){
 if(!mobile()) return typeof prev==='function'?prev.apply(this,arguments):undefined;
 const names=type==='cat'?['Siamese','Maine Coon','Persiano','Bengala','Ragdoll','British Shorthair','Scottish Fold','Sphynx','Norvegese delle Foreste','Siberiano','Abissino','Certosino','Birmano','Burmese','Devon Rex','Cornish Rex','Blu di Russia','Angora Turco','Van Turco','Oriental Shorthair','Exotic Shorthair','American Shorthair','Manx','Bombay']:['Labrador Retriever','Golden Retriever','Pastore Tedesco','Border Collie','Beagle','Bulldog Francese','Barboncino','Chihuahua','Bassotto','Jack Russell Terrier','Shiba Inu','Akita Inu','Siberian Husky','Maltese','Cavalier King Charles Spaniel','Boxer','Cocker Spaniel Inglese','Alano'];
 const name=names[i]; if(!name)return;
 /* Let the existing detail renderer build the authoritative content, then move that content into the mobile panel. */
 if(typeof prev==='function') prev.call(this,type,i);
 const sh=document.getElementById('sheet'),pnl=panel(); if(!sh||!pnl)return;
 const content=sh.innerHTML;
 const oldModal=document.getElementById('modal'); if(oldModal)oldModal.classList.remove('show');
 pnl.innerHTML='<div class="vmpTop"><b>'+esc(name)+'</b><button type="button" class="vmpClose">Chiudi</button></div><button type="button" class="vmpItem" id="vmpBreedDetailBack">← Torna alle razze</button><div id="vmpBreedDetailContent">'+content+'</div><button type="button" class="vmpItem" id="vmpBreedDetailBackBottom">← Torna alle razze</button>';
 pnl.querySelector('.vmpClose').onclick=()=>window.vpetCloseMobilePanel&&window.vpetCloseMobilePanel();
 const back=()=>{ if(typeof window.vpetShowBreedListMobile==='function')window.vpetShowBreedListMobile(type); };
 pnl.querySelector('#vmpBreedDetailBack').onclick=back;pnl.querySelector('#vmpBreedDetailBackBottom').onclick=back;
 pnl.querySelectorAll('[onclick*="vpetBreedList"],[onclick*="vpetBreedHub"]').forEach(b=>b.onclick=(e)=>{e.preventDefault();back()});
 pnl.classList.add('show');document.body.classList.add('vpetPanelOpen');
 };
})();</script>`;
if(!s.includes('VPET_MOBILE_BREED_DETAIL_20260823'))s=s.replace('</body>',js+'</body>');
await writeFile(p,s,'utf8');
console.log('VPET mobile breed detail continuity applied');
