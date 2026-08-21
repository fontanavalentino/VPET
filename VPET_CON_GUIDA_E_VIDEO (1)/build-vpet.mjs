import {cp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const out=path.join(root,'dist');
if(existsSync(out)) await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});

const entries=['index.html','assets','robots.txt','sitemap.xml','Guida_VPET.pdf','Video_Dimostrativo_VPET.mp4','salute-benessere','alimentazione-allergie','lettiera','adozioni','razze','viaggia-insieme','pet-culture','animali-nella-storia','qui-siamo-stati-bene','chiedi-a-vpet'];
for(const entry of entries){const src=path.join(root,entry);if(existsSync(src)) await cp(src,path.join(out,entry),{recursive:true});}

const indexPath=path.join(out,'index.html');
let s=await readFile(indexPath,'utf8');
s=s.replaceAll(',......v]', ',...v]');
if(!s.includes('const modal=document.getElementById')) s=s.replace('<script>\nconst SOURCES={','<script>\nconst modal=document.getElementById(\'modal\');\nconst sheet=document.getElementById(\'sheet\');\nconst SOURCES={');
s=s.replace("function closeM(){modal.classList.remove('show')}","function closeM(){const el=document.getElementById('modal');if(el)el.classList.remove('show')}");
s=s.replaceAll("openM('adoption')","openM('adopt')");

let oldStart=s.indexOf('\\n<script id="VPET_ROUTE_SEO_2026">');
if(oldStart<0) oldStart=s.indexOf('<script id="VPET_ROUTE_SEO_2026">');
if(oldStart>=0){const oldEnd=s.indexOf('</script>',oldStart);if(oldEnd>=0){let tail=oldEnd+9;while(s.slice(tail,tail+2)==='\\n')tail+=2;while(s.slice(tail,tail+1)==='\n')tail++;s=s.slice(0,oldStart)+s.slice(tail);}}

// Keep the original photographic dashboard. On phones it scales only enough to remain readable,
// then the user scrolls vertically; lower content grids use fewer columns rather than losing imagery.
const mobileCss=`\n<style id="VPET_MOBILE_DASH_2026">\n@media(max-width:700px){\n html,body{max-width:100%;overflow-x:hidden}\n .wrap{display:block!important;width:100%;max-width:100%;overflow:hidden;margin:0 auto}\n .wrap .dash{display:block;width:100%;height:auto;max-width:none}\n .dashboardExtension{width:100%;max-width:100%;box-sizing:border-box;padding:22px 14px 76px}\n .dashExtHead{align-items:flex-start;flex-direction:column;gap:10px}.dashExtHead h2{font-size:27px;line-height:1.08}.dailySurprise{align-self:flex-start}\n .dashboardCardGrid,.faqDashGrid,.smartToolGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}\n .dashboardMiniGrid,.peopleDashGrid,.guideVideoGrid{grid-template-columns:1fr!important}\n .dailyCard{grid-template-columns:44px 1fr 20px}\n .dashboardCardGrid button,.smartToolGrid button,.faqDashGrid button{min-width:0}\n}\n@media(max-width:390px){.dashboardCardGrid,.faqDashGrid,.smartToolGrid{grid-template-columns:1fr!important}}\n</style>\n`;
if(!s.includes('VPET_MOBILE_DASH_2026')) s=s.replace('</head>',mobileCss+'</head>');

const a11y=`\n<script id="VPET_A11Y_2026">\ndocument.addEventListener('DOMContentLoaded',()=>{const labels={sos:'Pet SOS',near:'Vicino a me',places:'Qui siamo stati bene',culture:'Pet Culture',history:'Animali nella storia',travel:'Viaggia insieme',breeds:'Guida alle razze',adopt:'Adozioni',health:'Salute e benessere',events:'Eventi',education:'Educazione',incredibili:'Incredibili insieme'};document.querySelectorAll('.hot').forEach((b,i)=>{if(!b.hasAttribute('type'))b.setAttribute('type','button');if(!b.getAttribute('aria-label')){const code=b.getAttribute('onclick')||'';const m=code.match(/openM\\(['\"]([^'\"]+)/);b.setAttribute('aria-label',m&&labels[m[1]]?('Apri '+labels[m[1]]):('Apri funzione VPET '+(i+1)));}});});\n</script>\n`;
if(!s.includes('VPET_A11Y_2026')) s=s.replace('</body>',a11y+'</body>');
await writeFile(indexPath,s,'utf8');
console.log('VPET build complete:',s.length,'chars');
