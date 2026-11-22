import {cp, readFile, writeFile} from 'node:fs/promises';

await cp('network', 'dist/network', {recursive:true});
const [page, stylesheet, service, network, html] = await Promise.all([
  readFile('network/index.html', 'utf8'),
  readFile('network/network.css', 'utf8'),
  readFile('network/service.js', 'utf8'),
  readFile('network/network.js', 'utf8'),
  readFile('dist/index.html', 'utf8')
]);

const networkMarkup = page.slice(page.indexOf('<body>') + '<body>'.length, page.indexOf('</body>'))
  .replace('<a href="/">Servizi VPET</a>', '')
  .replace('href="/network/"', 'href="#network"')
  .replace('<main>', '<div class="network-main">').replace('</main>', '</div>');
const networkCss = stylesheet.replace(':root{', ':host{').replace('body{', ':host{display:block;');
const mountedNetwork = `<section id="network" aria-label="VPET Network" tabindex="-1">
<template shadowrootmode="open"><style>${networkCss}</style>${networkMarkup}</template>
</section>`;

const dashboard = 'aria-label="Dashboard VPET mobile fotografica"';
if (!html.includes(dashboard)) throw new Error('Dashboard fotografica VPET non trovata');
const desktopDashboard = '<div class="wrap" aria-label="VPET dashboard">';
if (!html.includes(desktopDashboard)) throw new Error('Dashboard VPET desktop non trovata');
const main = html.indexOf('id="vpet-main"');
if (main < 0) throw new Error('Contenuto principale VPET non trovato');
const mainOpeningEnd = html.indexOf('>', main);
const networkIndex = html.indexOf('<section class="mobilePhotoDash"', mainOpeningEnd);
if (networkIndex < 0) throw new Error('Posizione del Network non trovata');

const servicesEnd = html.indexOf('</main>', networkIndex);
if (servicesEnd < 0) throw new Error('Fine dei servizi VPET non trovata');
const switcher = `<nav class="vpet-view-switch" aria-label="Sezioni VPET">
  <a href="#network" aria-controls="network">Network</a>
  <a href="#vpet-servizi" aria-controls="vpet-servizi">Servizi VPET</a>
</nav>`;
const combined = html.slice(0, networkIndex) + switcher + mountedNetwork +
  '<section id="vpet-servizi" tabindex="-1" aria-label="Servizi VPET">' +
  html.slice(networkIndex, servicesEnd) + '</section>' + html.slice(servicesEnd);
const updated = combined
  .replace('<button class="vmDashboard" data-go="dashboard">', '<button class="vmDashboard" id="vpetOpenNetwork" type="button">Entra nel network</button><button class="vmDashboard" data-go="dashboard">')
  .replace('<p class="vmLead">', '<div class="vmNetworkIntro"><p><strong>VPET è il sito di Pet Carpet per chi ama e aiuta gli animali.</strong> Nel Network le associazioni si presentano, condividono eventi e si aiutano: chi cerca volontari, materiali o collaborazioni incontra chi può dare una mano.</p><p>Puoi leggere liberamente. Iscriviti per pubblicare o commentare. Nella dashboard trovi guide, adozioni, razze e Pet SOS.</p></div><p class="vmLead">')
  .replace('</head>', '<style>@supports(overflow:clip){html,body{overflow-x:clip}}.vpet-view-switch{position:sticky;top:0;z-index:120;display:flex;justify-content:center;gap:.5rem;background:#102820;padding:.45rem .6rem;border-bottom:1px solid #39594e}.vpet-view-switch a{color:#fff;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.25rem .9rem;border:1px solid #789183;border-radius:10px;font:700 1rem/1.25 system-ui,sans-serif}.vpet-view-switch a[aria-current]{color:#19271f;background:#f7d480;border-color:#f7d480}.vpet-view-switch a:focus-visible{outline:2px solid white;outline-offset:2px}#network[hidden],#vpet-servizi[hidden]{display:none!important}#network,#vpet-servizi{scroll-margin-top:62px}@media(max-width:600px){.vpet-view-switch a{flex:1;max-width:11rem;text-align:center}}.vmNetworkIntro{margin:1rem 0;padding:.8rem 1rem;border-left:3px solid #f7d480;background:#142b38;color:#f5f7f9;border-radius:0 12px 12px 0;font-size:clamp(1rem,1.8vw,1.125rem);line-height:1.5}.vmNetworkIntro p{margin:0}.vmNetworkIntro p+p{margin-top:.5rem}@media(max-width:760px){.vmNavActions{flex-wrap:wrap}.vmNetworkIntro{padding:.65rem .8rem}}</style></head>')
  .replace('</body>', '<script type="module" src="/network/integrated.js"></script></body>');
await writeFile('dist/index.html', updated);

const scopedNetwork = network
  .replace('document.getElementById(id)', 'root.getElementById(id)')
  .replaceAll('document.querySelectorAll(', 'root.querySelectorAll(')
  .replaceAll('document.querySelector(', 'root.querySelector(')
  .replaceAll('document.activeElement', 'root.activeElement')
  .replace("new URL('/network/', location.origin)", "new URL('/#network', location.origin)");
const integration = `
const host = document.getElementById('network');
const root = host.shadowRoot || host.attachShadow({mode:'open'});
const template = host.querySelector('template[shadowrootmode]');
if (template) {
  root.append(template.content);
  template.remove();
}
const services = document.getElementById('vpet-servizi');
const switcher = document.querySelector('.vpet-view-switch');
const dashboardButton = document.querySelector('#vpet-home [data-go="dashboard"]');
function showView(isNetwork, moveFocus = false) {
  host.hidden = !isNetwork;
  services.hidden = isNetwork;
  for (const link of switcher.querySelectorAll('a')) {
    if (link.hash === (isNetwork ? '#network' : '#vpet-servizi')) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  if (moveFocus) {
    const panel = isNetwork ? host : services;
    panel.scrollIntoView({block:'start'});
    panel.focus({preventScroll:true});
  }
}
function chooseView(isNetwork) {
  const hash = isNetwork ? '#network' : '#vpet-servizi';
  if (location.hash !== hash) history.pushState(null, '', hash);
  showView(isNetwork, true);
}
for (const control of document.querySelectorAll('#vpet-home [data-go]')) {
  control.addEventListener('click', () => showView(false));
}
document.getElementById('vpetOpenNetwork')?.addEventListener('click', () => {
  dashboardButton?.click();
  chooseView(true);
});
switcher.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  chooseView(link.hash === '#network');
});
window.addEventListener('hashchange', () => {
  if (['', '#network', '#vpet-servizi'].includes(location.hash)) showView(location.hash === '#network', true);
});
const query = new URLSearchParams(location.search);
const isNetwork = location.hash === '#network' || query.has('iscriviti') || query.get('accesso') === 'google';
if (isNetwork || location.hash === '#vpet-servizi') dashboardButton?.click();
showView(isNetwork, isNetwork || location.hash === '#vpet-servizi');`;
await writeFile('dist/network/integrated.js', `${integration}\n${service}\n${scopedNetwork}\n`);
