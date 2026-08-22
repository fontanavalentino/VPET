import {execFileSync} from 'node:child_process';

const steps=[
  'build-vpet.mjs',
  'polish-vpet.mjs',
  'breed-hotfix.mjs',
  'experience-vpet.mjs',
  'quality-vpet.mjs',
  'meticulous-vpet.mjs',
  'meticulous-fix.mjs',
  'seo-accessibility-vpet.mjs',
  'participa-vpet.mjs',
  'emergenze-vpet.mjs',
  'final-polish-vpet.mjs',
  'deep-audit-vpet.mjs'
];

for(const step of steps){
  console.log(`\n▶ VPET build step: ${step}`);
  execFileSync(process.execPath,[step],{stdio:'inherit'});
}

console.log('\n✓ VPET build pipeline completed');
