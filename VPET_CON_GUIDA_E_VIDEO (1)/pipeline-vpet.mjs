import {execFileSync} from 'node:child_process';
const steps=['build-vpet.mjs','polish-vpet.mjs','breed-hotfix.mjs','experience-vpet.mjs','quality-vpet.mjs','meticulous-vpet.mjs','meticulous-fix.mjs','seo-accessibility-vpet.mjs','participa-vpet.mjs','emergenze-vpet.mjs','final-polish-vpet.mjs','critical-fix-vpet.mjs','history-editorial-vpet.mjs','breed-quality-vpet.mjs','breed-photo-wikimedia-vpet.mjs','final-force-breeds-vpet.mjs','navigation-core-vpet.mjs','mobile-direct-nav-vpet.mjs','mobile-breed-detail-vpet.mjs','deep-audit-vpet.mjs','path-audit-vpet.mjs'];
for(const step of steps){console.log('\nVPET build step: '+step);execFileSync(process.execPath,[step],{stdio:'inherit'});}
console.log('\nVPET build pipeline completed');
