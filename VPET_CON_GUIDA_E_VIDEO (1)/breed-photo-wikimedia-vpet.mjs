import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');
const css=`<style id="VPET_BREED_WIKI_PHOTO_20260822">
.vpetBreedPhoto,.vpetBreedDetailPhoto{background:linear-gradient(145deg,#13232d,#25311f)}
.vpetBreedPhoto[data-loading="1"],.vpetBreedDetailPhoto[data-loading="1"]{filter:saturate(.75);opacity:.82}
.vpetBreedImageCredit{font-size:10px;color:#89969e;margin-top:6px;line-height:1.35}.vpetBreedImageCredit a{color:#d8ac55}
</style>`;
if(!s.includes('VPET_BREED_WIKI_PHOTO_20260822'))s=s.replace('</head>',css+'</head>');
const js=`<script id="VPET_BREED_WIKI_PHOTO_JS_20260822">(()=>{
const titles={
'Siamese':'Siamese cat','Maine Coon':'Maine Coon','Persiano':'Persian cat','Bengala':'Bengal cat','Ragdoll':'Ragdoll','British Shorthair':'British Shorthair','Scottish Fold':'Scottish Fold','Sphynx':'Sphynx cat','Norvegese delle Foreste':'Norwegian Forest cat','Siberiano':'Siberian cat','Abissino':'Abyssinian cat','Certosino':'Chartreux','Birmano':'Birman','Burmese':'Burmese cat','Devon Rex':'Devon Rex','Cornish Rex':'Cornish Rex','Blu di Russia':'Russian Blue','Angora Turco':'Turkish Angora','Van Turco':'Turkish Van','Oriental Shorthair':'Oriental Shorthair','Exotic Shorthair':'Exotic Shorthair','American Shorthair':'American Shorthair','Manx':'Manx cat','Bombay':'Bombay cat',
'Labrador Retriever':'Labrador Retriever','Golden Retriever':'Golden Retriever','Pastore Tedesco':'German Shepherd','Border Collie':'Border Collie','Beagle':'Beagle','Bulldog Francese':'French Bulldog','Barboncino':'Poodle','Chihuahua':'Chihuahua (dog)','Bassotto':'Dachshund','Jack Russell Terrier':'Jack Russell Terrier','Shiba Inu':'Shiba Inu','Akita Inu':'Akita (dog)','Siberian Husky':'Siberian Husky','Maltese':'Maltese dog','Cavalier King Charles Spaniel':'Cavalier King Charles Spaniel','Boxer':'Boxer (dog)','Cocker Spaniel Inglese':'English Cocker Spaniel','Alano':'Great Dane'};
const cache=new Map();
const fallback=(name,type='cat')=>'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10212c"/><stop offset="1" stop-color="#30351f"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><text x="320" y="210" text-anchor="middle" font-size="92">${type==='dog'?'🐶':'🐱'}</text><text x="320" y="315" text-anchor="middle" fill="#f4b83e" font-family="Arial" font-size="34" font-weight="700">${String(name).replace(/[&<>]/g,'')}</text></svg>`);
async function wikiImage(name){if(cache.has(name))return cache.get(name);const title=titles[name]||name;const url='https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&pithumbsize=900&origin=*&titles='+encodeURIComponent(title);try{const r=await fetch(url,{mode:'cors'});if(!r.ok)throw new Error('http');const j=await r.json();const page=Object.values(j?.query?.pages||{})[0];const out=page?.thumbnail?.source||null;cache.set(name,out);return out}catch(e){cache.set(name,null);return null}}
async function applyImage(img,name,type){if(!img||!name)return;img.dataset.loading='1';img.src=fallback(name,type);const src=await wikiImage(name);if(src)img.src=src;delete img.dataset.loading;img.alt=(src?'Foto della razza ':'Illustrazione della razza ')+name;img.onerror=()=>{img.onerror=null;img.src=fallback(name,type)};}
function credit(container,name){if(!container||container.querySelector('.vpetBreedImageCredit'))return;const d=document.createElement('div');d.className='vpetBreedImageCredit';d.innerHTML='Immagine enciclopedica: <a href="https://en.wikipedia.org/wiki/'+encodeURIComponent(titles[name]||name).replace(/%20/g,'_')+'" target="_blank" rel="noopener">Wikipedia / Wikimedia Commons ↗</a>. Licenza e autore nella pagina sorgente.';container.appendChild(d)}
function enhanceList(type){document.querySelectorAll('.vpetBreedCardFix').forEach(card=>{const name=card.querySelector('b')?.textContent?.trim();const img=card.querySelector('.vpetBreedPhoto');if(name&&img)applyImage(img,name,type)})}
function enhanceDetail(type){const sh=document.getElementById('sheet');const name=sh?.querySelector('.vpetCatHero h2')?.textContent?.trim();const img=sh?.querySelector('.vpetBreedDetailPhoto');if(name&&img){applyImage(img,name,type);const note=sh.querySelector('.vpetBreedPhotoNote');if(note){note.textContent='Immagine collegata alla voce enciclopedica della razza.';credit(note.parentElement,name)}}}
const prevList=window.vpetBreedList;window.vpetBreedList=function(type){const r=prevList?.apply(this,arguments);queueMicrotask(()=>enhanceList(type));setTimeout(()=>enhanceList(type),80);return r};
const prevDetail=window.vpetBreedDetail;window.vpetBreedDetail=function(type,i){const r=prevDetail?.apply(this,arguments);queueMicrotask(()=>enhanceDetail(type));setTimeout(()=>enhanceDetail(type),80);return r};
})();</script>`;
if(!s.includes('VPET_BREED_WIKI_PHOTO_JS_20260822'))s=s.replace('</body>',js+'</body>');
await writeFile(p,s,'utf8');
console.log('VPET breed Wikimedia photo layer applied');
