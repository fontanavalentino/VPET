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

// Critical JS repair: this syntax error stopped many lower-level buttons.
s=s.replaceAll(',......v]', ',...v]');

// Explicit element references: safer than relying on browser globals created from element IDs.
if(!s.includes('const modal=document.getElementById')){
  s=s.replace('<script>\nconst SOURCES={','<script>\nconst modal=document.getElementById(\'modal\');\nconst sheet=document.getElementById(\'sheet\');\nconst SOURCES={');
}
s=s.replace("function closeM(){modal.classList.remove('show')}","function closeM(){const el=document.getElementById('modal');if(el)el.classList.remove('show')}");
s=s.replaceAll("openM('adoption')","openM('adopt')");

// Remove the old malformed route block containing literal \\n tokens. Real SEO routes are now static pages.
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

// Mobile dashboard: preserve the desktop artwork, but present it as a readable horizontal dashboard
// instead of shrinking the whole 1599px composition to phone width.
const mobileCss=`\n<style id="VPET_MOBILE_DASH_2026">\n@media (max-width:700px){\n  body{overflow-x:hidden}\n  .wrap{width:100%;max-width:none;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;touch-action:pan-x pan-y}\n  .wrap::-webkit-scrollbar{display:none}\n  .wrap .dash{width:980px;max-width:none;height:auto}\n  .wrap .hot{transform-origin:top left}\n  .dashboardExtension{width:100%;max-width:100%;padding:24px 18px 84px}\n  .dashExtHead{align-items:flex-start;flex-direction:column}\n  .dashExtHead h2{font-size:27px;line-height:1.08}\n  .dailySurprise{align-self:flex-start}\n}\n</style>\n`;
if(!s.includes('VPET_MOBILE_DASH_2026')) s=s.replace('</head>',mobileCss+'</head>');

// Accessibility layer for image-map style dashboard hotspots.
const a11y=`\n<script id="VPET_A11Y_2026">\ndocument.addEventListener('DOMContentLoaded',()=>{\n const labels={sos:'Pet SOS',near:'Vicino a me',places:'Qui siamo stati bene',culture:'Pet Culture',history:'Animali nella storia',travel:'Viaggia insieme',breeds:'Guida alle razze',adopt:'Adozioni',health:'Salute e benessere',events:'Eventi',education:'Educazione',incredibili:'Incredibili insieme'};\n document.querySelectorAll('.hot').forEach((b,i)=>{\n   if(!b.hasAttribute('type')) b.setAttribute('type','button');\n   if(!b.getAttribute('aria-label')){\n     const code=b.getAttribute('onclick')||''; const m=code.match(/openM\\(['\"]([^'\"]+)/);\n     b.setAttribute('aria-label',m&&labels[m[1]]?('Apri '+labels[m[1]]):('Apri funzione VPET '+(i+1)));\n   }\n });\n});\n</script>\n`;
if(!s.includes('VPET_A11Y_2026')) s=s.replace('</body>',a11y+'</body>');

await writeFile(indexPath,s,'utf8');
console.log('VPET build complete:',s.length,'chars');
