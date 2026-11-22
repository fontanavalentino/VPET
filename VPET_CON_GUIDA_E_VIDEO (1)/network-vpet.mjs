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
  .replace('href="/network/"', 'href="#network"')
  .replace('href="/">Servizi VPET', 'href="#vpet-servizi">Servizi VPET');
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

const combined = html.slice(0, networkIndex) + mountedNetwork +
  '<div id="vpet-servizi" tabindex="-1" aria-label="Servizi VPET"></div>' + html.slice(networkIndex);
const updated = combined
  .replace('<button class="vmDashboard" data-go="dashboard">', '<button class="vmDashboard" id="vpetOpenNetwork" type="button">Entra nel network</button><button class="vmDashboard" data-go="dashboard">')
  .replace('<p class="vmLead">', '<div class="vmNetworkIntro"><p><strong>VPET è il sito di Pet Carpet per chi ama e aiuta gli animali.</strong> Nel Network le associazioni si presentano, condividono eventi e si aiutano: chi cerca volontari, materiali o collaborazioni incontra chi può dare una mano.</p><p>Puoi leggere liberamente. Iscriviti per pubblicare o commentare. Nella dashboard trovi guide, adozioni, razze e Pet SOS.</p></div><p class="vmLead">')
  .replace('</head>', '<style>.vmNetworkIntro{margin:1rem 0;padding:.8rem 1rem;border-left:3px solid #f7d480;background:#142b38;color:#f5f7f9;border-radius:0 12px 12px 0;font-size:clamp(1rem,1.8vw,1.125rem);line-height:1.5}.vmNetworkIntro p{margin:0}.vmNetworkIntro p+p{margin-top:.5rem}@media(max-width:760px){.vmNavActions{flex-wrap:wrap}.vmNetworkIntro{padding:.65rem .8rem}}</style></head>')
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
const openNetwork = () => {
  document.querySelector('#vpet-home [data-go="dashboard"]')?.click();
  host.scrollIntoView({block:'start'});
  host.focus({preventScroll:true});
};
document.getElementById('vpetOpenNetwork')?.addEventListener('click', () => {
  history.replaceState(null, '', '#network');
  openNetwork();
});
if (location.hash === '#network' || new URLSearchParams(location.search).has('iscriviti')) openNetwork();
root.querySelector('a[href="#vpet-servizi"]')?.addEventListener('click', () => {
  document.getElementById('vpet-servizi')?.focus();
});`;
await writeFile('dist/network/integrated.js', `${integration}\n${service}\n${scopedNetwork}\n`);
