import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');
const js='<script id="VPET_NAV_CORE_20260822">(function(){'+
'function gm(){return document.getElementById("modal")}'+
'function gs(){return document.getElementById("sheet")}'+
'window.closeM=function(){var m=gm();if(m)m.classList.remove("show")};'+
'window.openM=function(k){'+
' if(k==="breeds"||k==="breed"||k==="razze"){if(typeof window.vpetBreedHub==="function")return window.vpetBreedHub();if(typeof window.vpetMeticulousBreedHub==="function")return window.vpetMeticulousBreedHub();}'+
' var m=gm(),sh=gs();if(!m||!sh)return;if(typeof D==="undefined"||!D[k])return;var sec=D[k],html="";'+
' (sec.items||[]).forEach(function(x,i){var label=x[0],action;if(k==="culture"&&typeof CULTURE!=="undefined"&&CULTURE[label]){action="cultureList("+JSON.stringify(label)+")";}else{action="detail("+JSON.stringify(k)+","+i+")";}html+="<button type=\\"button\\" onclick=\\""+action.replace(/"/g,"&quot;")+"\\">"+label+"</button>";});'+
' sh.innerHTML="<h2>"+sec.title+"</h2><p class=\\"lead\\">"+(sec.lead||"")+"</p><div class=\\"grid\\">"+html+"</div><button class=\\"close\\" type=\\"button\\" onclick=\\"closeM()\\">Chiudi</button>";'+
' m.style.pointerEvents="auto";m.classList.add("show");'+
'};'+
'window.addEventListener("DOMContentLoaded",function(){var m=gm();if(!m)return;if(!m.classList.contains("show"))m.style.pointerEvents="none";new MutationObserver(function(){m.style.pointerEvents=m.classList.contains("show")?"auto":"none"}).observe(m,{attributes:true,attributeFilter:["class"]});});'+
'})();</script>';
if(!s.includes('VPET_NAV_CORE_20260822'))s=s.replace('</body>',js+'</body>');
await writeFile(p,s,'utf8');
console.log('VPET navigation core applied');
