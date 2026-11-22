import {cp, readFile, writeFile} from 'node:fs/promises';

await cp('network', 'dist/network', {recursive:true});
const path = 'dist/index.html';
const html = await readFile(path, 'utf8');
const entry = '<section class="vpet-network-entry" aria-label="VPET Network"><div><p>IL NETWORK DI PET CARPET</p><h2>Quando ci diamo una zampa, cambia tutto.</h2><p>Associazioni, aziende e persone si incontrano per aiutare gli animali.</p><a href="/network/">Entra nel network</a></div></section>';
const style = '<style>.vpet-network-entry{margin:0 auto;padding:clamp(24px,5vw,64px) 20px;background:#173c31;color:#fff;text-align:center}.vpet-network-entry h2{font:700 clamp(28px,5vw,52px)/1.1 Georgia,serif;margin:8px 0}.vpet-network-entry p{font-size:16px}.vpet-network-entry a{display:inline-block;min-height:44px;padding:12px 22px;background:#f7d480;color:#19271f;border-radius:12px;font-weight:750;text-decoration:none}</style>';
const target = 'id="vpet-main"';
const start = html.indexOf(target);
if (start < 0) throw new Error('Contenuto principale VPET non trovato');
const end = html.indexOf('>', start);
await writeFile(path, (html.slice(0,end + 1) + entry + html.slice(end + 1)).replace('</head>', style + '</head>'));
