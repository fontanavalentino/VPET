import {readFile} from 'node:fs/promises';
import path from 'node:path';
const p=path.join(process.cwd(),'dist','index.html');
const s=await readFile(p,'utf8');
const checks=[
 ['SEO title',/<title>VPET \| Guide e strumenti per cani e gatti<\/title>/],
 ['Meta description',/<meta name="description"/],
 ['Canonical',/<link rel="canonical" href="https:\/\/vpet\.it\//],
 ['Mobile viewport',/<meta name="viewport"/],
 ['Accessible dialog',/role="dialog" aria-modal="true"/],
 ['Mobile bottom navigation',/vpetBottomNav/],
 ['Global search',/vpetGlobalSearch/],
 ['Breed hub',/vpetMeticulousBreedHub/],
 ['Cat archive',/24 razze feline/],
 ['Siamese',/Siamese/],
 ['Maine Coon',/Maine Coon/],
 ['Persiano',/Persiano/],
 ['Ragdoll',/Ragdoll/],
 ['Sticky back navigation',/vpetSectionNav/],
 ['Bottom back navigation',/vpetBottomBack/],
 ['Veterinary disclaimer',/non sostituisce il veterinario/i],
 ['PWA manifest',/manifest\.webmanifest/],
 ['Service worker registration',/VPET_SW_REGISTER/]
];
const failed=checks.filter(([,rx])=>!rx.test(s));
if(failed.length){console.error('VPET QA FAILED:',failed.map(x=>x[0]).join(', '));process.exit(1)}
const cats=['Siamese','Maine Coon','Persiano','Bengala','Ragdoll','British Shorthair','Scottish Fold','Sphynx','Norvegese delle Foreste','Siberiano','Abissino','Certosino','Birmano','Burmese','Devon Rex','Cornish Rex','Blu di Russia','Angora Turco','Van Turco','Oriental Shorthair','Exotic Shorthair','American Shorthair','Manx','Bombay'];
const missing=cats.filter(x=>!s.includes(x));
if(missing.length){console.error('VPET CAT ARCHIVE INCOMPLETE:',missing.join(', '));process.exit(1)}
console.log(`VPET QA OK — ${checks.length} structural checks, ${cats.length} feline breeds verified.`);
