import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const out=path.join(process.cwd(),'dist');
const p=path.join(out,'index.html');
let s=await readFile(p,'utf8');

// QA repairs: experience CSS contains these class names, so DOM insertion must test exact elements.
if(!s.includes('<a class="vpetSkip"')){
  s=s.replace(/<body([^>]*)>/i,'<body$1><a class="vpetSkip" href="#vpet-main">Vai al contenuto</a>');
}
if(!s.includes('<nav class="vpetBottomNav"')){
  const nav=`<nav class="vpetBottomNav" aria-label="Navigazione rapida VPET"><button type="button" data-vpet-home aria-label="Torna alla Home"><span aria-hidden="true">⌂</span>Home</button><button type="button" data-vpet-search aria-label="Apri la ricerca"><span aria-hidden="true">⌕</span>Cerca</button><button type="button" onclick="openM('sos')" aria-label="Apri Pet SOS"><span aria-hidden="true">＋</span>SOS</button><button type="button" onclick="openM('near')" aria-label="Apri Vicino a me"><span aria-hidden="true">⌖</span>Vicino</button></nav>`;
  s=s.replace('</body>',nav+'</body>');
}
// Search results announce updates to assistive tech.
s=s.replace('id="vpetSearchResults" class="vpetSearchResults" hidden','id="vpetSearchResults" class="vpetSearchResults" role="status" aria-live="polite" hidden');
// Improve modal semantics without coupling to current visual layout.
s=s.replace('<div class="modal" id="modal">','<div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">');
// Avoid duplicate theme-color declarations.
const themes=[...s.matchAll(/<meta name="theme-color" content="[^"]*">/g)];
if(themes.length>1){let seen=false;s=s.replace(/<meta name="theme-color" content="[^"]*">/g,m=>{if(seen)return '';seen=true;return '<meta name="theme-color" content="#02070b">';});}
// Render below-the-fold informational blocks only when approaching viewport.
if(!s.includes('VPET_QUALITY_2026'))s=s.replace('</head>',`<style id="VPET_QUALITY_2026">@media(min-width:701px){.dashboardExtension section,.dashboardExtension .card{content-visibility:auto;contain-intrinsic-size:1px 520px}}@media(max-width:700px){.mobilePhotoDash section{scroll-margin-top:82px}}.modal.show{overscroll-behavior:contain}</style></head>`);

// Resilient app shell: register a conservative service worker (network-first documents, cache-first static assets).
if(!s.includes('VPET_SW_REGISTER'))s=s.replace('</body>',`<script id="VPET_SW_REGISTER">if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}</script></body>`);

await writeFile(p,s,'utf8');
await writeFile(path.join(out,'sw.js'),`const C='vpet-shell-v1';const A=['/','/manifest.webmanifest','/vpet-icon.svg','/assets/dashboard.png'];self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(C).then(c=>c.put('/',x));return r}).catch(()=>caches.match('/')));return}if(u.origin===location.origin){e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.ok){const x=r.clone();caches.open(C).then(k=>k.put(e.request,x))}return r})))}});`);
console.log('VPET quality layer applied');