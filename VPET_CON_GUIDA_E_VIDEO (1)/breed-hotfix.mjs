import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');
const hotfix=`<script id="VPET_BREED_HOTFIX_2026">
(function(){
const catNames=['Siamese','Maine Coon','Persiano','Bengala','Ragdoll','British Shorthair','Scottish Fold','Sphynx','Norvegese delle Foreste','Siberiano','Abissino','Certosino','Birmano','Burmese','Devon Rex','Cornish Rex','Blu di Russia','Angora Turco','Van Turco','Oriental Shorthair','Exotic Shorthair','American Shorthair','Manx','Bombay'];
const dogNames=['Labrador Retriever','Golden Retriever','Pastore Tedesco','Border Collie','Beagle','Bulldog Francese','Barboncino','Chihuahua','Bassotto','Jack Russell Terrier','Shiba Inu','Akita Inu','Siberian Husky','Maltese','Cavalier King Charles Spaniel','Boxer','Cocker Spaniel Inglese','Alano'];
window.vpetBreedList=function(type){
 const el=document.getElementById('sheet'); if(!el)return;
 const names=type==='cat'?catNames:dogNames, icon=type==='cat'?'🐱':'🐶', title=type==='cat'?'Razze di gatti':'Razze di cani';
 el.innerHTML='<button class="breedTopBack" onclick="vpetBreedHub()">← Guida alle Razze</button><div class="breedHero"><h2>'+title+'</h2><p>Tocca una razza per aprire la sua scheda completa.</p></div><input class="breedSearch" placeholder="Cerca una razza…" oninput="vpetFilterBreeds(this.value)"><div class="breedGrid" id="breedGrid">'+names.map((name,i)=>'<button class="breedCard" data-name="'+name.toLowerCase().replace(/\"/g,'&quot;')+'" data-type="'+type+'" data-index="'+i+'"><span class="breedBadge">'+icon+'</span><b>'+name+'</b><small>Apri storia, caratteristiche, cura e curiosità</small></button>').join('')+'</div><button class="vpetEndBack" onclick="vpetBreedHub()">← Torna a Guida alle Razze</button>';
 el.querySelectorAll('.breedCard').forEach(btn=>btn.addEventListener('click',()=>window.vpetBreedDetail(btn.dataset.type,Number(btn.dataset.index))));
};
window.vpetSmartBack=function(){
 const modal=document.getElementById('modal');
 if(!modal||!modal.classList.contains('show'))return;
 const sheet=document.getElementById('sheet');
 const top=sheet&&sheet.querySelector('.breedTopBack,.backbtn');
 if(top){top.click();return;}
 if(typeof closeM==='function')closeM();
};
window.addEventListener('DOMContentLoaded',()=>{
 const fb=document.getElementById('vpetBackFloat'); if(fb)fb.onclick=()=>vpetSmartBack();
 const sheet=document.getElementById('sheet');
 if(sheet)new MutationObserver(()=>{
   const b=sheet.querySelector('.vpetEndBack:last-of-type');
   if(b&&/dashboard/i.test(b.textContent||''))b.onclick=()=>vpetSmartBack();
 }).observe(sheet,{childList:true,subtree:false});
});
})();
</script>`;
if(!s.includes('VPET_BREED_HOTFIX_2026'))s=s.replace('</body>',hotfix+'</body>');
await writeFile(p,s,'utf8');
console.log('VPET breed hotfix complete');
