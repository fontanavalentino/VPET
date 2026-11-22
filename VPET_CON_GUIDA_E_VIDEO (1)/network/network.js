'use strict';

const byId = id => document.getElementById(id);
const dialog = byId('dialog');
const body = byId('dialog-body');
const posts = [
  {author:'Rifugio del quartiere',city:'Roma',type:'Cerchiamo',title:'Una mattina da donare',body:'Cerchiamo volontari per sistemare le aree di passeggio insieme.',sample:true},
  {author:'Bottega a quattro zampe',city:'Roma',type:'Offriamo',title:'Coperte pronte per un nuovo inverno',body:'Mettiamo a disposizione coperte pulite per una realtà del territorio.',sample:true},
  {author:'Amici del parco',city:'Castel Gandolfo',type:'Eventi',title:'Una passeggiata per conoscersi',body:'Un incontro tra associazioni, volontari e famiglie.',sample:true}
];
const profiles = [];
const notes = new Map();
let filter = '';
let recorder;
let pendingFile;
let previewUrl;
let previousFocus;

function el(tag, value, className) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (className) node.className = className;
  return node;
}
function button(label, action) {
  const item = el('button', label);
  item.type = 'button';
  item.addEventListener('click', action);
  return item;
}
function attachment(file, url) {
  const kind = file.type.split('/')[0];
  const node = el(kind === 'image' ? 'img' : kind);
  node.src = url;
  if (kind === 'image') {
    node.alt = 'Foto allegata al post';
    node.loading = 'lazy';
  } else {
    node.controls = true;
    node.preload = 'none';
    if (kind === 'video') node.playsInline = true;
  }
  return node;
}
function renderFeed() {
  const city = byId('territory').value.trim().toLocaleLowerCase('it');
  const matches = posts.filter(post => (!filter || post.type === filter) && post.city.toLocaleLowerCase('it').includes(city));
  byId('results').textContent = matches.length ? matches.length + (matches.length === 1 ? ' post' : ' post trovati') : 'Nessun post corrispondente.';
  byId('feed').replaceChildren(...matches.map(post => {
    const card = el('article', '', 'card');
    card.append(el('div', post.type + (post.sample ? ' · Esempio' : ''), 'tag'), el('h3', post.title),
      el('div', [post.author, post.city, post.date].filter(Boolean).join(' · '), 'meta'), el('p', post.body));
    if (notes.has(post)) card.append(el('p', 'Pet Carpet · ' + notes.get(post)));
    if (post.file) card.append(attachment(post.file, post.url));
    return card;
  }));
}
function appendContacts(parent, profile) {
  const links = el('div', '', 'contacts');
  const phone = profile.phone?.replace(/[^+0-9]/g, '');
  const whatsapp = profile.whatsapp?.replace(/[^0-9]/g, '');
  for (const [label, url] of [
    ['Chiama', phone && 'tel:' + phone],
    ['WhatsApp', whatsapp && 'https://wa.me/' + whatsapp],
    ['Email', profile.email && 'mailto:' + profile.email]
  ]) {
    if (!url) continue;
    const link = el('a', label, 'contact');
    link.href = url;
    links.append(link);
  }
  parent.append(links);
}
function renderProfiles() {
  const directory = byId('directory');
  directory.replaceChildren();
  if (!profiles.length) directory.append(el('p', 'Presenta la tua realtà per creare la prima scheda di prova.'));
  for (const profile of profiles) {
    const card = el('article');
    card.append(el('h3', profile.name), el('p', profile.kind + ' · ' + profile.city, 'meta'), el('p', profile.description));
    if (profile.public) appendContacts(card, profile);
    directory.append(card);
  }
}
function cleanupMedia() {
  if (recorder?.state === 'recording') {
    recorder.onstop = null;
    recorder.stop();
    recorder.stream.getTracks().forEach(track => track.stop());
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
  pendingFile = undefined;
}
function setupComposer(form) {
  const file = byId('attachment');
  const record = byId('record');
  const preview = byId('media-preview');
  const status = el('p', '', 'hint');
  status.setAttribute('role', 'status');
  record.after(status);
  const expectedTypes = new Set(file.accept.split(','));
  function selectFile(value) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    preview.replaceChildren();
    pendingFile = undefined;
    status.textContent = '';
    if (!value) return;
    if (!expectedTypes.has(value.type.split(';')[0]) || value.size > 20 * 1024 * 1024) {
      status.textContent = 'Scegli un formato supportato e un file entro 20 MB.';
      file.value = '';
      return;
    }
    pendingFile = value;
    previewUrl = URL.createObjectURL(value);
    preview.append(attachment(value, previewUrl), button('Rimuovi allegato', () => {
      file.value = '';
      selectFile();
    }));
  }
  file.addEventListener('change', () => selectFile(file.files[0]));
  form.elements.type.addEventListener('change', () => {
    const isEvent = form.elements.type.value === 'Eventi';
    form.elements.date.required = isEvent;
    byId('event-date').hidden = !isEvent;
  });
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    record.hidden = true;
  }
  record.addEventListener('click', async () => {
    if (recorder?.state === 'recording') {
      recorder.stop();
      return;
    }
    record.disabled = true;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({audio:true});
      if (!dialog.open || !form.isConnected) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      recorder = new MediaRecorder(stream);
      const chunks = [];
      const active = recorder;
      active.ondataavailable = event => chunks.push(event.data);
      active.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        record.textContent = 'Registra un vocale';
        form.querySelector('[type=submit]').disabled = false;
        file.value = '';
        selectFile(new Blob(chunks, {type:active.mimeType}));
      };
      active.start();
      record.textContent = 'Ferma registrazione';
      form.querySelector('[type=submit]').disabled = true;
      status.textContent = 'Registrazione in corso.';
    } catch {
      stream?.getTracks().forEach(track => track.stop());
      status.textContent = 'Microfono non disponibile. Puoi allegare un file audio.';
    } finally {
      record.disabled = false;
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const post = Object.fromEntries(new FormData(form));
    if (post.type !== 'Eventi') delete post.date;
    if (pendingFile) {
      post.file = pendingFile;
      post.url = URL.createObjectURL(pendingFile);
    }
    posts.unshift(post);
    filter = '';
    byId('territory').value = '';
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(!item.dataset.filter)));
    renderFeed();
    dialog.close();
  });
}
function setupInvite(form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const url = new URL('/network/', location.origin);
    const message = 'Ciao! Ti invito a scoprire VPET Network, il progetto di Pet Carpet per far incontrare chi aiuta gli animali. ' + url;
    const share = el('textarea');
    share.readOnly = true;
    share.value = message;
    share.setAttribute('aria-label', 'Testo dell’invito');
    const whatsapp = el('a', 'Apri WhatsApp', 'contact');
    whatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(message);
    const email = el('a', 'Apri Email', 'contact');
    email.href = 'mailto:?subject=VPET%20Network&body=' + encodeURIComponent(message);
    const target = byId('invitation');
    target.replaceChildren(share, whatsapp, email);
    if (navigator.clipboard) target.append(button('Copia testo', async () => {
      try {
        await navigator.clipboard.writeText(message);
        target.append(el('p', 'Invito copiato.', 'hint'));
      } catch {
        share.focus();
        share.select();
      }
    }));
  });
}
function openPanel(key, trigger) {
  previousFocus = trigger;
  const titles = {publish:'Pubblica nel network',profile:'Presenta la tua realtà',invite:'Invita una realtà',privacy:'Privacy e pubblicazione',admin:'Rubrica e moderazione di prova'};
  byId('dialog-title').textContent = titles[key];
  body.replaceChildren();
  const template = byId(key);
  if (template) body.append(template.content.cloneNode(true));
  if (key === 'publish') setupComposer(body.querySelector('form'));
  if (key === 'invite') setupInvite(body.querySelector('form'));
  if (key === 'profile') body.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    profiles.unshift(Object.fromEntries(new FormData(event.currentTarget)));
    renderProfiles();
    dialog.close();
  });
  if (key === 'privacy') {
    body.append(el('p','Questa anteprima conserva i dati inseriti nella memoria della pagina fino al suo ricaricamento. Usa nomi, recapiti e allegati fittizi.'),
      el('p','Il microfono si attiva solo su richiesta e il vocale resta nella sessione di prova. Gli inviti aprono il canale che scegli, dove decidi tu se inviarli. WhatsApp è un servizio esterno.'),
      el('p','Per il lancio pubblico serviranno l’informativa completa di Pet Carpet, le regole del network e le preferenze di contatto per ogni canale.'));
  }
  if (key === 'admin') {
    body.append(el('p','Simulazione degli strumenti di Pet Carpet. Usa solo dati fittizi.'));
    for (const profile of profiles) {
      const card = el('article', '', 'card');
      card.append(el('h3', profile.name), el('p', profile.kind + ' · ' + profile.city, 'meta'));
      appendContacts(card, profile);
      body.append(card);
    }
    for (const post of posts.filter(item => !item.sample)) {
      const card = el('article', '', 'card');
      const note = el('input');
      note.maxLength = 500;
      note.value = notes.get(post) || '';
      note.setAttribute('aria-label', 'Integrazione della redazione');
      card.append(el('h3', post.title), note, button('Salva nota Pet Carpet', () => {
        notes.set(post, note.value.trim());
        renderFeed();
        dialog.close();
      }), button('Rimuovi dalla prova', () => {
        posts.splice(posts.indexOf(post), 1);
        notes.delete(post);
        if (post.url) URL.revokeObjectURL(post.url);
        renderFeed();
        dialog.close();
      }));
      body.append(card);
    }
  }
  dialog.showModal();
}
document.querySelectorAll('[data-open]').forEach(item => item.addEventListener('click', () => openPanel(item.dataset.open, item)));
document.querySelectorAll('[data-filter]').forEach(item => item.addEventListener('click', () => {
  filter = item.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(control => control.setAttribute('aria-pressed', String(control === item)));
  renderFeed();
}));
byId('territory').addEventListener('input', renderFeed);
byId('close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  cleanupMedia();
  previousFocus?.focus();
});
renderFeed();
renderProfiles();
