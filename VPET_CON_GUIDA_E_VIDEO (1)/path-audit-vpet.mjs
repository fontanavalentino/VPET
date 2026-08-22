import {readFile} from 'node:fs/promises';
import path from 'node:path';

const p=path.join(process.cwd(),'dist','index.html');
const s=await readFile(p,'utf8');

const required=[
  ['breed hub','vpetMeticulousBreedHub'],
  ['cat breed list',"vpetBreedList('cat')"],
  ['breed detail','window.vpetBreedDetail'],
  ['breed search input','Cerca una razza'],
  ['global search input','Cerca servizi, razze, consigli'],
  ['search result opener','openResult'],
  ['top breed back','Razze di gatti'],
  ['bottom back','Torna a Razze di gatti'],
  ['mobile breakpoint','@media(max-width:430px)'],
  ['Siamese','Siamese'],
  ['Maine Coon','Maine Coon'],
  ['Ragdoll','Ragdoll'],
  ['history label','La sua storia'],
  ['curiosity label','Curiosità']
];

const missing=required.filter(([,token])=>!s.includes(token));
if(missing.length){
  console.error('VPET PATH AUDIT FAILED:',missing.map(([name])=>name).join(', '));
  process.exit(1);
}

const cats=['Siamese','Maine Coon','Persiano','Bengala','Ragdoll','British Shorthair','Scottish Fold','Sphynx','Norvegese delle Foreste','Siberiano','Abissino','Certosino','Birmano','Burmese','Devon Rex','Cornish Rex','Blu di Russia','Angora Turco','Van Turco','Oriental Shorthair','Exotic Shorthair','American Shorthair','Manx','Bombay'];
const absent=cats.filter(n=>!s.includes(n));
if(absent.length){
  console.error('VPET PATH AUDIT FAILED — missing cat breeds:',absent.join(', '));
  process.exit(1);
}

console.log('VPET PATH AUDIT OK — search → cats → breed detail → back path present; 24 feline breeds present.');
