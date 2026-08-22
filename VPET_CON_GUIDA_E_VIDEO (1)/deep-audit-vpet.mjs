import {readFile} from 'node:fs/promises';
import path from 'node:path';

const p=path.join(process.cwd(),'dist','index.html');
const s=await readFile(p,'utf8');

const checks=[
  ['Guida alle Razze',/Guida alle Razze/i],
  ['Ingresso Cani',/>Cani</i],
  ['Ingresso Gatti',/>Gatti</i],
  ['Archivio 24 razze feline',/24 razze feline/i],
  ['Scheda Siamese',/Siamese/],
  ['Scheda Maine Coon',/Maine Coon/],
  ['Scheda Persiano',/Persiano/],
  ['Navigazione sticky',/vpetSectionNav/],
  ['Torna indietro a fine sezione',/vpetBottomBack/],
  ['Ricerca globale',/vpetGlobalSearch/],
  ['Chiedi a VPET',/Chiedi a VPET/],
  ['Può mangiarlo',/Può mangiarlo\?/],
  ['È tossico',/È tossico\?/],
  ['Partecipa a VPET',/Partecipa a VPET/i],
  ['Invio video',/video/i],
  ['Invio consigli',/consigl/i],
  ['Invio materiali',/material/i],
  ['Mail Pet Carpet',/petcarpetfestival@gmail\.com/i],
  ['PWA manifest',/manifest\.webmanifest/],
  ['Service worker',/serviceWorker|VPET_SW_REGISTER/],
  ['Dialog accessibile',/role="dialog"[^>]*aria-modal="true"|aria-modal="true"[^>]*role="dialog"/]
];

const failed=checks.filter(([,rx])=>!rx.test(s));
if(failed.length){
  console.error('VPET DEEP AUDIT FAILED:',failed.map(x=>x[0]).join(', '));
  process.exit(1);
}

console.log(`VPET DEEP AUDIT OK — ${checks.length} experience checks passed.`);
