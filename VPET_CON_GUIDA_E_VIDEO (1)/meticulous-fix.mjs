import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');
s=s.replace("<p>'+esc(x[0])+' · '+esc(x[2])+' · Attività '+esc(x[3])+'</p>","<p>'+esc(x[0])+' · '+esc(x[1])+' · Attività '+esc(x[2])+'</p>");
s=s.replace("<div class=\"vpetCatFacts\"><div class=\"vpetCatFact\"><b>Origine / storia</b><span>'+esc(x[6])+'</span></div>","<div class=\"vpetCatFacts\">");
await writeFile(p,s,'utf8');
console.log('VPET meticulous fix applied');
