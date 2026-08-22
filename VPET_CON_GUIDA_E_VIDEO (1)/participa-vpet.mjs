import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');

if(!s.includes('VPET_PARTECIPA_2026')){
  const css=`<style id="VPET_PARTECIPA_STYLE_2026">
  .participaDash{padding-top:0}
  .participaWrap{border:1px solid #76511d;border-radius:22px;padding:22px;background:radial-gradient(circle at 86% 18%,#d89a2a2b,transparent 25%),linear-gradient(135deg,#10212c,#0a151d);overflow:hidden;position:relative}
  .participaWrap:before{content:'🎬';position:absolute;right:24px;top:13px;font-size:70px;opacity:.13}
  .participaIntro{max-width:780px;margin-bottom:16px}.participaIntro h3{font:700 28px Georgia,serif;color:#f0b43e;margin:4px 0 8px}.participaIntro p{color:#d7dee2;line-height:1.55;margin:0}
  .participaGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.participaCard{border:1px solid #60461d;border-radius:17px;padding:17px;background:#0f1e28;min-height:145px}.participaCard span{font-size:30px}.participaCard b{display:block;color:#f2ba4c;font-size:17px;margin:9px 0 6px}.participaCard p{color:#cbd4d8;font-size:13px;line-height:1.5;margin:0}
  .participaAction{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px;align-items:center}.participaAction a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;border-radius:999px;padding:11px 16px;text-decoration:none;font-weight:900}.participaAction .primary{background:#eaaa2a;color:#171006}.participaAction .secondary{border:1px solid #8a6423;color:#f2bd55;background:#132632}.participaMail{color:#e9eef0;font-size:13px}.participaMail strong{color:#f2bd55}
  @media(max-width:760px){.participaWrap{padding:18px}.participaGrid{grid-template-columns:1fr}.participaCard{min-height:auto}.participaIntro h3{font-size:25px}.participaAction{display:grid;grid-template-columns:1fr}.participaAction a{width:100%}.participaMail{text-align:center}}
  </style>`;
  s=s.replace('</head>',css+'</head>');

  const section=`<section class="dashboardExtension participaDash" id="VPET_PARTECIPA_2026">
    <div class="participaWrap">
      <div class="participaIntro"><span class="eyebrow2">PARTECIPA A VPET</span><h3>Hai una storia, un video o un consiglio da condividere?</h3><p>VPET cresce anche grazie alle esperienze di chi vive ogni giorno accanto agli animali. Se hai un video, una testimonianza, un consiglio utile, una curiosità, una storia o materiale che potrebbe essere interessante per la community, puoi proporlo a Pet Carpet.</p></div>
      <div class="participaGrid">
        <div class="participaCard"><span>🎥</span><b>Vuoi partecipare con un video?</b><p>Racconta una storia, un'esperienza, un progetto o un momento speciale legato agli animali e invialo alla redazione Pet Carpet.</p></div>
        <div class="participaCard"><span>💡</span><b>Hai un consiglio utile?</b><p>Condividi un suggerimento, un'esperienza o un'informazione che potrebbe aiutare altri proprietari e appassionati.</p></div>
        <div class="participaCard"><span>📚</span><b>Hai materiale da condividere?</b><p>Foto, testimonianze, curiosità, iniziative ed esperienze possono diventare nuovi spunti da verificare e raccontare su VPET.</p></div>
      </div>
      <div class="participaAction">
        <a class="primary" href="mailto:petcarpetfestival@gmail.com?subject=Partecipa%20a%20VPET">✉️ Scrivi a Pet Carpet</a>
        <a class="secondary" href="https://www.petcarpetfestival.it/" target="_blank" rel="noopener">🐾 Scopri Pet Carpet</a>
        <span class="participaMail">Email: <strong>petcarpetfestival@gmail.com</strong></span>
      </div>
    </div>
  </section>`;

  const marker='<section class="dashboardExtension guideVideoDash">';
  if(s.includes(marker)) s=s.replace(marker,section+'\n\n'+marker);
  else s=s.replace('</body>',section+'</body>');
}

await writeFile(p,s,'utf8');
console.log('VPET participation section applied');
