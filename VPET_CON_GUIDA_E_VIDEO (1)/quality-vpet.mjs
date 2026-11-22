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
await writeFile(path.join(out,'sw.js'),`const C = 'vpet-shell-v3';
const assets = ['/','/manifest.webmanifest','/network/icon-180.png','/network/icon-192.png','/network/icon-512.png','/assets/dashboard.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(C).then(cache => cache.addAll(assets)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('vpet-shell-') && key !== C)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),6500);
    event.respondWith(fetch(request,{signal:controller.signal}).then(response => {
      if (response.ok && !url.search) {
        const copy = response.clone();
        event.waitUntil(caches.open(C).then(cache => cache.put(request,copy)).catch(() => {}));
      }
      return response;
    }).catch(async () => {
      const cache = await caches.open(C);
      return await cache.match(url.pathname) || await cache.match('/') || Response.error();
    }).finally(() => clearTimeout(timeout)));
    return;
  }
  if (['video','audio'].includes(request.destination)) return;
  event.respondWith(caches.open(C).then(async cache => {
    const refresh = async () => {
      const response = await fetch(request);
      if (response.ok && response.status !== 206) event.waitUntil(cache.put(request,response.clone()).catch(() => {}));
      return response;
    };
    if (url.pathname.startsWith('/network/') && ['script','style'].includes(request.destination) && !url.search) {
      return refresh().catch(async () => await cache.match(request) || Response.error());
    }
    return (await cache.match(request)) || refresh();
  }));
});`);
console.log('VPET quality layer applied');
