import { readFile } from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
const failures = [];
const warnings = [];

const requiredHome = [
  'Quante volte ti è',
  'Cosa possiamo fare per voi oggi?',
  'Sto pensando a un animale',
  'Ho già un animale',
  'Ho bisogno di aiuto',
  'Voglio scoprire il mondo pet',
  'Un momento difficile',
  'Torna alla Home VPet'
];
for (const text of requiredHome) if (!html.includes(text)) failures.push(`Home: manca "${text}"`);

const genericPatterns = [
  /lorem ipsum/i,
  /coming soon/i,
  /da compilare/i,
  /contenuto in arrivo/i,
  /testo esempio/i,
  /placeholder/i
];
for (const rx of genericPatterns) if (rx.test(html)) failures.push(`Contenuto generico/placeholder rilevato: ${rx}`);

const buttonCount = (html.match(/<button\b/gi) || []).length;
const modalCount = (html.match(/class=["'][^"']*(modal|sheet|overlay)[^"']*["']/gi) || []).length;
if (buttonCount < 10) warnings.push(`Pochi pulsanti rilevati (${buttonCount})`);
if (modalCount < 1) warnings.push('Nessuna area modale/sheet rilevata');

const breedSignals = ['Razze', 'razza', 'gatto', 'cane'];
const breedHits = breedSignals.filter(x => html.toLowerCase().includes(x.toLowerCase())).length;
if (breedHits < 3) warnings.push('Area razze poco rappresentata nel contenuto compilato');

console.log(`VPET QA contenuti: ${buttonCount} pulsanti, ${modalCount} aree interattive.`);
for (const w of warnings) console.warn('WARN:', w);
if (failures.length) {
  for (const f of failures) console.error('FAIL:', f);
  process.exit(1);
}
console.log('PASS: nessun placeholder evidente e Home guidata presente.');
