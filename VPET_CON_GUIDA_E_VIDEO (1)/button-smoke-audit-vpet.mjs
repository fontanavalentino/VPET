import {readFile} from 'node:fs/promises';
import path from 'node:path';
const html=await readFile(path.join(process.cwd(),'dist','index.html'),'utf8');
const checks=[
 ['Pet SOS route',/pet sos/i],['Vicino a me route',/vicino a me/i],['Pet Friendly route',/pet friendly/i],['Eventi route',/eventi/i],['Viaggia insieme route',/viaggia insieme/i],['Adozioni route',/adozioni/i],['Guida alle Razze',/guida alle razze/i],['Pet Culture',/pet culture/i],['Animali nella Storia',/animali nella storia/i],
 ['Mobile direct navigation','VPET_MOBILE_DIRECT_NAV_JS_20260822'],['Breed hub mobile','vpetShowBreedHubMobile'],['Breed list mobile','vpetShowBreedListMobile'],['Breed detail renderer','vpetBreedDetail'],['Cat back navigation','Torna alle razze di gatti'],['Dog back navigation','Torna alle razze di cani'],['Dog detail data','Labrador Retriever'],['Cat detail data','Siamese'],['Breed search','Cerca una razza']
];
const failed=[];
for(const [name,test] of checks){const ok=test instanceof RegExp?test.test(html):html.toLowerCase().includes(String(test).toLowerCase());if(!ok)failed.push(name)}
if(failed.length){console.error('VPET BUTTON SMOKE AUDIT FAILED:',failed.join(', '));process.exit(1)}
console.log('VPET BUTTON SMOKE AUDIT OK — '+checks.length+' critical navigation/button checks passed.');
