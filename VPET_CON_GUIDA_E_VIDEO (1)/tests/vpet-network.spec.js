import assert from 'node:assert/strict';
import {test} from '@playwright/test';
 const profiles = [
  [10,320,1],[20,390,1],[30,430,1],[40,768,1],[50,1440,1],[60,1024,1.5],[70,640,2]
 ];
 const base='http://127.0.0.1:4173/network/';
 const id='1';
 const post={id:'x',owner:id,type:'Esperienze',title:'Una collaborazione',body:'Una raccolta solidale',city:'Roma',partner:'Rifugio',outcome:'Venti coperte',network_members:{name:'Pet Test'}};
for (const [age,width,zoom] of profiles) test('VPET Network · scenario ' + age, async ({browser}) => {
  const errors=[];
  const ctx=await browser.newContext({viewport:{width,height:850},hasTouch:width<500,serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
  const page=await ctx.newPage();
  page.on('pageerror', error=>errors.push(error.message));
  const posts=[{...post}];const comments=[];const savedProfiles=[];const savedContacts=[];
  await page.route('https://enmhknczdgtivjiwszwk.supabase.co/**',async route=>{
   const url=new URL(route.request().url());
   const path=url.pathname;
   const method=route.request().method();
   const body=method === 'POST' ? route.request().postDataJSON() : null;
   let data=[];
   if(path.includes('/auth/')) data={access_token:'test',refresh_token:'qa',user:{id,user_metadata:{display_name:'Utente QA'}}};
   if(path.endsWith('network_posts')) {
    if(method==='POST') posts.push({...body,id:'new',network_members:{name:'Utente QA'}});
    data=posts;
   }
   if(path.endsWith('network_members') && method==='GET') data=[{name:'Utente QA'}];
   if(path.endsWith('network_comments')) {
    if(method==='POST') comments.push({...body,id:'c',network_members:{name:'Utente QA'}});
    data=comments;
   }
   if(path.endsWith('network_profiles')) {
    if(method==='POST') savedProfiles.push(body);
    data=savedProfiles;
   }
   if(path.endsWith('network_contacts')) {
    if(method==='POST') savedContacts.push(body);
    data=savedContacts;
   }
   await route.fulfill({json:data,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
  });
  await page.goto(base);
  await page.getByText('Una collaborazione',{exact:true}).waitFor();
  await page.evaluate(z=>document.documentElement.style.fontSize=(16*z)+'px',zoom);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'page overflow '+age);
  await page.getByRole('button',{name:'Installa VPET'}).click();
  assert(await page.getByText('Windows · Edge o Chrome',{exact:true}).isVisible());
  await page.keyboard.press('Escape');
  assert(await page.getByRole('button',{name:'Installa VPET'}).evaluate(x=>x===document.activeElement));
  await page.getByRole('button',{name:'Invita una realtà'}).first().click();
  assert((await page.locator('#invite-whatsapp').getAttribute('href')).includes('iscriviti'));
  await page.getByRole('button',{name:'Copia link'}).click();
  await page.getByText('Link copiato.').waitFor();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),base+'?iscriviti=1');
  await page.getByRole('button',{name:'Chiudi'}).click();
  assert.equal(new URL(await page.getByRole('link',{name:'Scrivi a Pet Carpet'}).getAttribute('href')).searchParams.get('subject'),'Candidature Network Pet Carpet');
  await page.getByRole('button',{name:'Esperienze',exact:true}).click();
  await page.getByText('Venti coperte').waitFor();
  if(age===10) {
   assert(!await page.getByRole('button',{name:'Rubrica Pet Carpet'}).isVisible());
   await page.getByRole('button',{name:'Iscriviti e pubblica'}).click();
   assert.equal(await page.getByRole('checkbox').count(),1);
  } else {
   await page.getByRole('button',{name:'Iscriviti e pubblica'}).click();
   await page.getByLabel('Nome da mostrare nel network').fill('Utente QA');
   await page.getByLabel('Email',{exact:true}).fill('test@example.invalid');
   await page.getByLabel('Password',{exact:true}).fill('Password-test-2026');
   await page.getByRole('checkbox').check();
   await page.getByRole('button',{name:'Continua e pubblica'}).click();
   await page.getByLabel('Tipo di post').selectOption('Esperienze');
   await page.getByRole('dialog').getByLabel('Territorio').fill('Roma');
   await page.getByLabel('Titolo',{exact:true}).fill('Prova completa');
   await page.getByLabel('Raccontaci').fill('Una storia di collaborazione.');
   await page.getByLabel('Con chi hai collaborato').fill('Rifugio');
   await page.getByLabel('Che cosa avete ottenuto insieme?').fill('Sessanta coperte.');
   await page.getByRole('checkbox').check();
   await page.getByRole('button',{name:'Pubblica post'}).click();
   const card=page.locator('article').filter({hasText:'Prova completa'});
   await card.waitFor();
   await card.locator('summary').click();
   await card.getByLabel('Scrivi un commento').fill('Ci sono anch’io!');
   await card.getByRole('button',{name:'Pubblica commento'}).click();
   await card.getByText('Ci sono anch’io!').waitFor();
   await page.getByRole('button',{name:'Presenta la tua realtà'}).click();
   await page.getByLabel('Nome della realtà').fill('Associazione QA');
   await page.getByRole('dialog').getByLabel('Territorio').fill('Roma');
   await page.getByLabel('Chi siete e cosa fate').fill('Aiutiamo gli animali.');
   await page.getByLabel('Telefono',{exact:true}).fill('+390612345678');
   await page.getByLabel('WhatsApp',{exact:true}).fill('+390612345678');
   await page.getByRole('dialog').getByLabel('Email',{exact:true}).fill('qa@example.invalid');
   await page.getByRole('checkbox').check();
   await page.getByRole('button',{name:'Salva la scheda'}).click();
   await page.getByRole('heading',{name:'Associazione QA'}).waitFor();
   await page.getByRole('link',{name:'Chiama'}).waitFor();
  }
  assert.deepEqual(errors,[]);
  await ctx.close();
});

test('Le offerte ruotano ogni 10 secondi e aprono il post specifico', async ({page}) => {
  const origin = 'https://enmhknczdgtivjiwszwk.supabase.co';
  const profile = {owner:'a', name:'Associazione QA', kind:'Associazione', city:'Roma',description:'Aiutiamo gli animali'};
  const posts = [
    {id:'1',owner:'a',type:'Cerchiamo',city:'Roma',title:'Cerchiamo volontari',body:'Una mano per la raccolta.',network_members:{name:'Redazione'}},
    {id:'2',owner:'a',type:'Offriamo',city:'Roma',title:'Offriamo coperte',body:'Coperte per i rifugi.',network_members:{name:'Redazione'}}
  ];
  await page.clock.install();
  await page.route(origin + '/rest/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({json:path.endsWith('network_posts') ? posts : path.endsWith('network_profiles') ? [profile] : [],headers:{'Access-Control-Allow-Origin':'*'}});
  });
  await page.goto('/network/');
  const display = page.locator('#network-display');
  const title = display.getByRole('heading', {level:3});
  await title.waitFor();
  const first = await title.textContent();
  await page.clock.runFor(9000);
  assert.equal(await title.textContent(),first);
  await page.clock.runFor(1100);
  const second = await title.textContent();
  assert.notEqual(second,first);
  await display.getByRole('button',{name:'Pausa',exact:true}).click();
  await page.clock.runFor(12000);
  assert.equal(await title.textContent(),second);
  await display.getByRole('button',{name:'Leggi il messaggio'}).click();
  assert.equal(await page.locator('#feed article').count(),1);
  assert.equal(await page.locator('#feed article h3').textContent(),second);
});

for (const [age,width,zoom] of profiles) test('VPET originale e Network fusi · scenario ' + age, async ({page}) => {
  await page.setViewportSize({width,height:850});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://enmhknczdgtivjiwszwk.supabase.co/rest/**', route =>
    route.fulfill({json:[],headers:{'Access-Control-Allow-Origin':'*'}}));
  await page.goto('/');
  await page.getByText('VPET è il sito di Pet Carpet per chi ama e aiuta gli animali.', {exact:true}).waitFor();
  await page.getByRole('button',{name:'Vai alla dashboard',exact:true}).waitFor();
  await page.getByRole('button',{name:'Entra nel network',exact:true}).click();
  const network = page.locator('#network');
  await network.getByRole('heading',{name:'Chi cerca, chi offre'}).waitFor();
  await page.evaluate(z => document.documentElement.style.fontSize = (16*z)+'px',zoom);
  assert(await network.evaluate(host => host.scrollWidth <= host.clientWidth + 1));
  await network.getByRole('button',{name:'Invita una realtà',exact:true}).first().click();
  assert.equal(new URL(await network.locator('#invite-link').inputValue()).hash,'#network');
  await page.keyboard.press('Escape');
  await network.getByRole('link',{name:'Servizi VPET',exact:true}).click();
  const breeds = page.locator('.wrap,.mobilePhotoDash').getByRole('button',{name:/^Guida alle razze$/i}).filter({visible:true});
  await breeds.click();
  await page.getByRole('heading',{name:'Guida alle Razze',exact:true}).waitFor();
  await page.getByRole('button',{name:/24 razze feline/}).waitFor();
  assert.deepEqual(errors,[]);
});
