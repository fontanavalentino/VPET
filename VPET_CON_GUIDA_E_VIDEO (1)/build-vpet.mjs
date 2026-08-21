import {cp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const out=path.join(root,'dist');
if(existsSync(out)) await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});

const entries=['index.html','assets','robots.txt','sitemap.xml','Guida_VPET.pdf','Video_Dimostrativo_VPET.mp4','salute-benessere','alimentazione-allergie','lettiera','adozioni','razze','viaggia-insieme','pet-culture','animali-nella-storia','qui-siamo-stati-bene','chiedi-a-vpet'];
for(const entry of entries){
  const src=path.join(root,entry);
  if(existsSync(src)) await cp(src,path.join(out,entry),{recursive:true});
}

const indexPath=path.join(out,'index.html');
let s=await readFile(indexPath,'utf8');

s=s.replaceAll(',......v]', ',...v]');
if(!s.includes('const modal=document.getElementById')){
  s=s.replace('<script>\nconst SOURCES={','<script>\nconst modal=document.getElementById(\'modal\');\nconst sheet=document.getElementById(\'sheet\');\nconst SOURCES={');
}
s=s.replace("function closeM(){modal.classList.remove('show')}","function closeM(){const el=document.getElementById('modal');if(el)el.classList.remove('show')}");
s=s.replaceAll("openM('adoption')","openM('adopt')");

let oldStart=s.indexOf('\\n<script id="VPET_ROUTE_SEO_2026">');
if(oldStart<0) oldStart=s.indexOf('<script id="VPET_ROUTE_SEO_2026">');
if(oldStart>=0){
  const oldEnd=s.indexOf('</script>',oldStart);
  if(oldEnd>=0){
    let tail=oldEnd+'</script>'.length;
    while(s.slice(tail,tail+2)==='\\n') tail+=2;
    while(s.slice(tail,tail+1)==='\n') tail+=1;
    s=s.slice(0,oldStart)+s.slice(tail);
  }
}

const mobileCss=`\n<style id="VPET_MOBILE_DASH_2026">\n.mobileDash{display:none}\n@media (max-width:700px){\n body{overflow-x:hidden}\n .wrap{display:none!important}\n .mobileDash{display:block;background:#02070b;color:#fff;padding:14px 14px 24px;border-bottom:1px solid #4f3919}\n .mTop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.mBrand{display:flex;align-items:center;gap:9px;font-weight:900;color:#f0b43e;font-size:25px}.mBrand span{font-size:30px}.mSearch{border:1px solid #5a431e;border-radius:14px;background:#0d171f;padding:12px 14px;color:#9eabb3;font-size:14px;margin-bottom:14px}\n .mHero{border:1px solid #69491c;border-radius:22px;padding:20px;background:linear-gradient(135deg,#152632,#0b1117 58%,#3a2b18);margin-bottom:14px}.mHero small{color:#e6a92f;font-weight:900;letter-spacing:1.4px}.mHero h1{font:700 32px/1.02 Georgia,serif;margin:8px 0;color:#fff}.mHero h1 b{color:#efb43d}.mHero p{color:#d2d8dc;line-height:1.45;margin:0 0 14px}.mHero button{border:0;border-radius:999px;background:#e5a62e;color:#191006;padding:12px 16px;font-weight:900}\n .mQuick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:18px}.mQuick button,.mCard{border:1px solid #5e431c;background:#0f1b24;color:#fff;border-radius:16px;padding:14px;text-align:left}.mQuick button span,.mCard span{font-size:25px;display:block;margin-bottom:7px}.mQuick b,.mCard b{display:block;color:#efb43d;font-size:14px}.mQuick small,.mCard small{display:block;color:#c7d0d5;line-height:1.35;margin-top:4px}\n .mSectionTitle{display:flex;align-items:end;justify-content:space-between;margin:17px 0 10px}.mSectionTitle h2{font:700 25px Georgia,serif;color:#f0b43e;margin:0}.mSectionTitle small{color:#aeb9bf}.mGrid{display:grid;grid-template-columns:1fr;gap:10px}.mCard{min-height:104px}.mCard:active,.mQuick button:active{transform:scale(.99)}\n .dashboardExtension{width:100%;max-width:100%;padding:24px 18px 84px}.dashExtHead{align-items:flex-start;flex-direction:column}.dashExtHead h2{font-size:27px;line-height:1.08}.dailySurprise{align-self:flex-start}\n}\n</style>\n`;
if(!s.includes('VPET_MOBILE_DASH_2026')) s=s.replace('</head>',mobileCss+'</head>');

const mobileHtml=`\n<section class="mobileDash" aria-label="Dashboard VPET mobile">\n <div class="mTop"><div class="mBrand"><span>🐾</span>VPET</div><button class="dailySurprise" onclick="vpetSurprise()">✨ Sorprendimi</button></div>\n <div class="mSearch">Cerca servizi, razze, consigli…</div>\n <div class="mHero"><small>VPET EXPERIENCE</small><h1>Insieme, possiamo fare <b>la differenza.</b></h1><p>Servizi, storie e strumenti per vivere meglio il rapporto con il tuo animale.</p><button onclick="openM('incredibili')">Scopri VPET →</button></div>\n <div class="mQuick">\n  <button onclick="openM('sos')"><span>➕</span><b>Pet SOS</b><small>Serve aiuto?</small></button>\n  <button onclick="openM('near')"><span>📍</span><b>Vicino a me</b><small>Servizi e negozi</small></button>\n  <button onclick="openM('places')"><span>🐾</span><b>Pet Friendly</b><small>Luoghi e strutture</small></button>\n  <button onclick="openM('events')"><span>📅</span><b>Eventi</b><small>Cosa fare insieme</small></button>\n  <button onclick="openM('travel')"><span>🚗</span><b>Viaggia insieme</b><small>Guide e consigli</small></button>\n  <button onclick="openM('adopt')"><span>❤️</span><b>Adozioni</b><small>Trova il tuo amico</small></button>\n </div>\n <div class="mSectionTitle"><h2>Esplora VPET</h2><small>Tutto a portata di zampa</small></div>\n <div class="mGrid">\n  <button class="mCard" onclick="openM('incredibili')"><span>🐶</span><b>Incredibili insieme</b><small>Gli animali che aiutano, cercano, soccorrono e accompagnano.</small></button>\n  <button class="mCard" onclick="openM('places')"><span>💛</span><b>Qui siamo stati bene</b><small>Luoghi consigliati dalla community e recensioni vere.</small></button>\n  <button class="mCard" onclick="openM('culture')"><span>📚</span><b>Pet Culture</b><small>Libri, cinema, musica, arte e fotografia.</small></button>\n  <button class="mCard" onclick="openM('travel')"><span>🏔️</span><b>Viaggia insieme</b><small>Guide, consigli e destinazioni pet friendly.</small></button>\n  <button class="mCard" onclick="openM('breeds')"><span>🐕</span><b>Guida alle Razze</b><small>Storia, caratteristiche, attitudini e curiosità.</small></button>\n  <button class="mCard" onclick="openM('history')"><span>🏛️</span><b>Animali nella Storia</b><small>Leggende, eroi e avventure che hanno fatto la storia.</small></button>\n </div>\n</section>\n`;
if(!s.includes('Dashboard VPET mobile')) s=s.replace('<div class="wrap" aria-label="VPET dashboard">',mobileHtml+'<div class="wrap" aria-label="VPET dashboard">');

const a11y=`\n<script id="VPET_A11Y_2026">\ndocument.addEventListener('DOMContentLoaded',()=>{\n const labels={sos:'Pet SOS',near:'Vicino a me',places:'Qui siamo stati bene',culture:'Pet Culture',history:'Animali nella storia',travel:'Viaggia insieme',breeds:'Guida alle razze',adopt:'Adozioni',health:'Salute e benessere',events:'Eventi',education:'Educazione',incredibili:'Incredibili insieme'};\n document.querySelectorAll('.hot').forEach((b,i)=>{\n   if(!b.hasAttribute('type')) b.setAttribute('type','button');\n   if(!b.getAttribute('aria-label')){\n     const code=b.getAttribute('onclick')||''; const m=code.match(/openM\\(['\"]([^'\"]+)/);\n     b.setAttribute('aria-label',m&&labels[m[1]]?('Apri '+labels[m[1]]):('Apri funzione VPET '+(i+1)));\n   }\n });\n});\n</script>\n`;
if(!s.includes('VPET_A11Y_2026')) s=s.replace('</body>',a11y+'</body>');

await writeFile(indexPath,s,'utf8');
console.log('VPET build complete:',s.length,'chars');
