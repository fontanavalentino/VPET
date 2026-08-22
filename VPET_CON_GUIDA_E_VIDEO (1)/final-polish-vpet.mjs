import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const p=path.join(process.cwd(),'dist','index.html');
let s=await readFile(p,'utf8');

if(!s.includes('VPET_FINAL_POLISH_2026')){
  const css=`<style id="VPET_FINAL_POLISH_2026">
  /* Conservative final polish: improve ergonomics without changing approved dashboard/photo layout */
  :where(button,a,input,select,textarea,[role="button"]):focus-visible{outline:3px solid #efb43d;outline-offset:3px}
  :where(button,a,[role="button"]){-webkit-tap-highlight-color:rgba(239,180,61,.18)}
  .sheet :where(button,a:not(.sourceLinks a)),.dashboardExtension :where(button,a:not(.hot)){min-height:44px}
  .sheet,.dashboardExtension{overflow-wrap:anywhere}
  .dashboardExtension[id]{scroll-margin-top:76px}
  .sheet p,.sheet li,.dashboardExtension p,.dashboardExtension li{word-break:normal;hyphens:auto}
  .sourceLinks a{min-height:36px;display:inline-flex;align-items:center}
  @media(max-width:700px){
    .dashboardExtension{padding-left:16px;padding-right:16px;padding-bottom:max(92px,calc(74px + env(safe-area-inset-bottom)))}
    .sheet{padding-bottom:max(22px,calc(14px + env(safe-area-inset-bottom)))}
    .sheet :where(button,a:not(.sourceLinks a)),.dashboardExtension :where(button,a:not(.hot)){min-height:46px}
    .close{position:sticky;bottom:max(0px,env(safe-area-inset-bottom));z-index:4;box-shadow:0 -8px 22px #071018cc}
    .vpetPlusFab{bottom:max(18px,calc(10px + env(safe-area-inset-bottom)))}
    .participaMail{overflow-wrap:anywhere}
    .emergCard li{margin-bottom:5px}
  }
  @media(prefers-reduced-motion:reduce){
    *,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  }
  </style>`;
  s=s.replace('</head>',css+'</head>');
}

await writeFile(p,s,'utf8');
console.log('VPET final polish applied');
