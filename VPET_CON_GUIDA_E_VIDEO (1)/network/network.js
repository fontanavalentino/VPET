'use strict';

const byId = id => document.getElementById(id);
const dialog = byId('dialog');
const body = byId('dialog-body');
const posts = [];
const profiles = [];
const notes = new Map();
const comments = new Map();
let filter = '';
let recorder;
let pendingFile;
let previewUrl;
let previousFocus;
let member;
let moderator = false;
let googleAvailable = false;
let displayPosts = [];
let displayIndex = 0;
let displayTimer;
let displayPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let openedPost;
const opportunityTypes = {request:'Cerchiamo',offer:'Offriamo'};
const dateFormat = new Intl.DateTimeFormat('it-IT',{dateStyle:'long',timeZone:'UTC'});
const isOpportunity = post => ['Cerchiamo','Offriamo'].includes(post.type);

let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  const control = byId('install-app');
  if (control) control.hidden = false;
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/network/sw.js').catch(() => {});

function notice(message) {
  const node = byId('network-status');
  node.textContent = message;
  node.hidden = !message;
}

async function loadNetwork() {
  const [newPosts, newProfiles, newComments, newNotes, contacts] = await Promise.all([
    networkService.rest('posts', '?select=*,network_members(name)&order=created_at.desc&limit=150'),
    networkService.rest('profiles', '?order=name.asc&limit=500'),
    networkService.rest('comments', '?select=*,network_members(name)&order=created_at.asc&limit=2000'),
    networkService.rest('notes', '?select=*'),
    networkService.rest('contacts', '?select=*&limit=500')
  ]);
  const contactsByOwner = new Map(contacts.map(row => [row.owner, row]));
  posts.splice(0, posts.length, ...newPosts.map(row => ({...row, author:row.network_members.name})));
  profiles.splice(0, profiles.length, ...newProfiles.map(row => ({...row, ...contactsByOwner.get(row.owner)})));
  comments.clear();
  notes.clear();
  const byPost = new Map(posts.map(post => [post.id, post]));
  for (const row of newComments) {
    const post = byPost.get(row.post_id);
    if (!post) continue;
    if (!comments.has(post)) comments.set(post, []);
    comments.get(post).push({...row, author:row.network_members.name});
  }
  for (const row of newNotes) if (byPost.has(row.post_id)) notes.set(byPost.get(row.post_id), row.message);
  renderFeed();
  renderProfiles();
  renderRecent();
  initDisplay();
}
async function submit(form, action) {
  const control = form.querySelector('[type=submit]');
  control.disabled = true;
  try { await action(); }
  catch (error) {
    const status = form.querySelector('[data-form-status]') || el('p', '', 'hint');
    status.setAttribute('role', 'status');
    status.textContent = error.message;
    if (!status.isConnected) form.append(status);
  } finally { control.disabled = false; }
}
async function loadMember(name) {
  const id = networkService.id();
  if (!id) return;
  const [rows, staff] = await Promise.all([
    networkService.rest('members', '?id=eq.' + id),
    networkService.rest('moderators', '?id=eq.' + id)
  ]);
  member = rows[0]?.name || name || networkService.name();
  if (member && !rows.length) await networkService.put('members', {id,name:member});
  moderator = staff.length > 0;
  document.querySelector('[data-open=admin]').hidden = !moderator;
  document.querySelector('[data-publish]').textContent = member ? 'Pubblica' : 'Iscriviti e pubblica';
  byId('sign-out').hidden = !member;
}
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
function initDisplay() {
  const associations = new Map(profiles.filter(profile => profile.kind === 'Associazione').map(profile => [profile.owner, profile]));
  displayPosts = posts.filter(post => isOpportunity(post) && associations.has(post.owner)).map(post => ({
    post, association:associations.get(post.owner)
  }));
  for (let i = displayPosts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [displayPosts[i], displayPosts[j]] = [displayPosts[j], displayPosts[i]];
  }
  displayIndex = 0;
  renderDisplay();
  scheduleDisplay();
}
function scheduleDisplay() {
  clearTimeout(displayTimer);
  const display = byId('network-display');
  if (displayPaused || document.hidden || display.matches(':hover') || display.contains(document.activeElement) || displayPosts.length < 2) return;
  displayTimer = setTimeout(() => moveDisplay(1),10000);
}
function moveDisplay(delta) {
  if (!displayPosts.length) return;
  displayIndex = (displayIndex + delta + displayPosts.length) % displayPosts.length;
  renderDisplay();
  scheduleDisplay();
}
function renderDisplay() {
  const target = byId('display-card');
  const {post, association} = displayPosts[displayIndex] || {};
  byId('display-controls').hidden = displayPosts.length < 2;
  if (!post) {
    target.replaceChildren(el('p','Le richieste e le offerte delle associazioni appariranno qui.'));
    return;
  }
  const text = post.body.trim().replace(/\s+/g,' ');
  const summary = text.length > 170 ? text.slice(0,170).replace(/\s+\S*$/,'') + '…' : text;
  const open = button('Leggi il messaggio', () => openPost(post));
  open.classList.add('primary');
  target.replaceChildren(el('p', association.name + ' · ' + post.city, 'display-meta'),
    el('p',post.type,'tag'),el('h3',post.title),el('p',summary),open);
  byId('display-position').textContent = (displayIndex + 1) + ' di ' + displayPosts.length;
  const pause = byId('display-pause');
  pause.textContent = displayPaused ? 'Riprendi' : 'Pausa';
  pause.setAttribute('aria-pressed',String(displayPaused));
}
function openPost(post) {
  openedPost = post.id;
  filter = post.type;
  byId('territory').value = '';
  updateFilters();
  renderFeed();
  const detail = byId('post-' + post.id);
  detail?.scrollIntoView({block:'start'});
  detail?.focus({preventScroll:true});
}
function postDate(post) {
  if (!post.date) return '';
  const date = dateFormat.format(new Date(post.date));
  return isOpportunity(post) ? 'Entro il ' + date : date;
}
function renderRecent() {
  const recent = posts.filter(post => isOpportunity(post) && !post.sample).slice(0,4);
  const status = byId('recent-status');
  status.textContent = recent.length ? '' : 'Le prime richieste e offerte appariranno qui. Puoi pubblicare la tua dai pulsanti qui sopra.';
  byId('recent-search').hidden = !recent.length;
  byId('recent-opportunities').replaceChildren(...recent.map(post => {
    const card = el('article', '', 'card');
    const open = button('Leggi il post', () => openPost(post));
    open.setAttribute('aria-label', 'Leggi il post: ' + post.title);
    card.append(el('p',post.type,'tag'), el('h3',post.title),
      el('p',[post.city,postDate(post)].filter(Boolean).join(' · '),'meta'),open);
    return card;
  }));
}
function updateFilters() {
  document.querySelectorAll('[data-filter]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.filter === filter)));
}
function commentSection(post) {
  const section = el('details', '', 'comments');
  const list = comments.get(post) || [];
  const summary = el('summary', list.length === 1 ? '1 commento' : list.length + ' commenti');
  section.append(summary);
  for (const comment of list) {
    const entry = el('div', '', 'comment');
    entry.append(el('strong', comment.author), el('p', comment.message));
    section.append(entry);
  }
  if (!member) {
    section.append(button('Iscriviti per commentare', event => openPanel('join', event.currentTarget, () => {
      renderFeed();
      const sections = byId('feed').querySelectorAll('details');
      const visiblePosts = Array.from(byId('feed').children);
      const index = visiblePosts.findIndex(card => card.dataset.post === String(posts.indexOf(post)));
      if (sections[index]) {
        sections[index].open = true;
        sections[index].querySelector('textarea')?.focus();
      }
    })));
    return section;
  }
  const form = el('form');
  const label = el('label', 'Scrivi un commento');
  const field = el('textarea');
  field.required = true;
  field.maxLength = 600;
  label.append(field);
  const send = el('button', 'Pubblica commento', 'primary');
  send.type = 'submit';
  form.append(label, send);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const message = field.value.trim();
    if (!message) {
      field.value = '';
      field.reportValidity();
      return;
    }
    submit(form, async () => {
      const [saved] = await networkService.rest('comments','',{method:'POST',value:{post_id:post.id,owner:networkService.id(),message},prefer:'return=representation'});
      list.push({...saved, author:member});
      comments.set(post, list);
      const updated = commentSection(post);
      updated.open = true;
      section.replaceWith(updated);
      updated.querySelector('textarea')?.focus();
    });
  });
  section.append(form);
  return section;
}
function renderFeed() {
  const city = byId('territory').value.trim().toLocaleLowerCase('it');
  const matches = posts.filter(post => {
    const categoryMatches = filter === 'opportunità' ? isOpportunity(post) :
      filter ? post.type === filter : city || !isOpportunity(post);
    return (!openedPost || post.id === openedPost) && categoryMatches && post.city.toLocaleLowerCase('it').includes(city);
  });
  byId('results').textContent = matches.length ? matches.length + (matches.length === 1 ? ' post' : ' post trovati') : 'Non ci sono ancora post per questa ricerca.';
  byId('feed').replaceChildren(...matches.map(post => {
    const card = el('article', '', 'card');
    card.dataset.post = String(posts.indexOf(post));
    card.id = 'post-' + post.id;
    card.tabIndex = -1;
    card.append(el('div', post.type + (post.sample ? ' · Esempio' : ''), 'tag'), el('h3', post.title),
      el('div', [post.author, post.city, postDate(post)].filter(Boolean).join(' · '), 'meta'), el('p', post.body));
    if (openedPost) card.append(button('Torna ai risultati', () => {
      openedPost = undefined;
      renderFeed();
      document.querySelector('[data-filter][aria-pressed=true]')?.focus();
    }));
    if (post.partner) card.append(el('p', 'In collaborazione con ' + post.partner, 'meta'));
    if (post.outcome) card.append(el('strong', 'Che cosa abbiamo ottenuto'), el('p', post.outcome));
    if (notes.has(post)) card.append(el('p', 'Pet Carpet · ' + notes.get(post)));
    if (post.media) card.append(button('Apri allegato', async event => {
      const trigger = event.currentTarget;
      trigger.disabled = true;
      try {
        const media = attachment({type:post.media_type}, await networkService.mediaUrl(post.media));
        trigger.replaceWith(media);
      } catch {
        trigger.disabled = false;
        notice('L’allegato non è disponibile. Riprova tra poco.');
      }
    }));
    card.append(commentSection(post));
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
  if (!profiles.length) directory.append(el('p', 'Presenta la tua realtà per creare la prima scheda.'));
  for (const profile of profiles) {
    const card = el('article');
    card.append(el('h3', profile.name), el('p', profile.kind + ' · ' + profile.city, 'meta'), el('p', profile.description));
    if (profile.visible) appendContacts(card, profile);
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
function setupComposer(form, preferredType) {
  byId('publishing-as').textContent = 'Pubblicherai come ' + member;
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
  function updateFields() {
    const type = form.elements.type.value;
    const isEvent = type === 'Eventi';
    const opportunity = isOpportunity({type});
    form.elements.date.required = isEvent;
    byId('event-date').hidden = !isEvent && !opportunity;
    byId('post-date-label').textContent = isEvent ? 'Data dell’evento' : 'Entro quando (facoltativo)';
    const isExperience = form.elements.type.value === 'Esperienze';
    byId('experience-fields').hidden = !isExperience;
    form.elements.partner.required = isExperience;
    form.elements.outcome.required = isExperience;
  }
  if (preferredType) form.elements.type.value = preferredType;
  updateFields();
  form.elements.type.addEventListener('change', updateFields);
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
    submit(form, async () => {
      const {city,type,title,body,date,partner,outcome} = Object.fromEntries(new FormData(form));
      const post = {city,type,title,body,owner:networkService.id(),date:(type === 'Eventi' || isOpportunity({type})) ? date || null : null,
        partner:type === 'Esperienze' ? partner : null,outcome:type === 'Esperienze' ? outcome : null};
      if (pendingFile) {
        post.media = await networkService.upload(pendingFile);
        post.media_type = pendingFile.type.split(';')[0];
      }
      try { await networkService.rest('posts','',{method:'POST',value:post}); }
      catch (error) {
        if (post.media) await networkService.removeMedia(post.media).catch(() => {});
        throw error;
      }
      filter = type;
      openedPost = undefined;
      byId('territory').value = '';
      updateFilters();
      dialog.close();
      notice('Post pubblicato.');
      await loadNetwork().catch(() => notice('Post salvato. Ricarica per aggiornare il feed.'));
    });
  });
}
function setupInvite() {
  const url = new URL('/network/', location.origin);
  url.searchParams.set('iscriviti', '1');
  const input = byId('invite-link');
  input.value = url.href;
  const message = 'Ti invito su VPET Network, la comunità di Pet Carpet per chi aiuta gli animali. Iscriviti e raccontaci cosa fai, cosa cerchi o come puoi dare una mano. ' + url.href;
  byId('invite-whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(message);
  byId('invite-email').href = 'mailto:?subject=' + encodeURIComponent('Un invito a VPET Network') + '&body=' + encodeURIComponent(message);
  byId('copy-invite').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url.href);
      byId('invite-status').textContent = 'Link copiato.';
    } catch {
      input.focus();
      input.select();
      byId('invite-status').textContent = 'Link selezionato. Tocca Copia nel menu del telefono.';
    }
  });
}
function openPanel(key, trigger, resume) {
  previousFocus = trigger;
  if (['publish','profile'].includes(key) && !member) return openPanel('join', trigger, () => openPanel(key, trigger));
  if (key === 'admin' && !moderator) return;
  const titles = {'google-profile':'Completa il tuo profilo',install:'Installa VPET',login:'Accedi a VPET',join:'Iscriviti e pubblica',publish:'Pubblica nel network',profile:trigger?.dataset.profileKind ? 'Presentati come professionista' : 'Presenta la tua realtà',invite:'Invita una realtà',privacy:'Privacy e pubblicazione',admin:'Rubrica e moderazione di prova'};
  byId('dialog-title').textContent = titles[key];
  body.replaceChildren();
  const template = byId(key);
  if (template) body.append(template.content.cloneNode(true));
  if (key === 'install' && installPrompt) {
    const control = byId('install-app');
    control.hidden = false;
    control.addEventListener('click', async () => {
      await installPrompt?.prompt();
      installPrompt = undefined;
      control.hidden = true;
    });
  }
  if (key === 'publish') setupComposer(body.querySelector('form'), trigger?.dataset.opportunity);
  if (key === 'invite') setupInvite();
  if (key === 'google-profile') {
    const form = body.querySelector('form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      submit(form, async () => {
        const name = form.elements.displayName.value.trim();
        if (!name) throw new Error('Inserisci il nome da mostrare.');
        await loadMember(name);
        if (resume) resume();
        else openPanel('publish', trigger);
      });
    });
  }
  if (key === 'join' || key === 'login') {
    const form = body.querySelector('form');
    const google = body.querySelector('[data-google]');
    {
      if (googleAvailable) body.querySelector('[data-google-entry]').hidden = false;
      google.addEventListener('click', async () => {
        google.disabled = true;
        const opportunity = Object.keys(opportunityTypes).find(key => opportunityTypes[key] === trigger?.dataset.opportunity);
        const destination = trigger?.dataset.profileKind ? 'professionista' :
          trigger?.dataset.open === 'profile' ? 'profile' : opportunity || 'publish';
        try { await networkService.googleStart(destination); }
        catch {
          form.querySelector('[data-form-status]').textContent = 'Non riesco ad aprire Google. Riprova o continua con email.';
          google.disabled = false;
        }
      });
    }
    form.querySelector('[data-login]')?.addEventListener('click', () => openPanel('login', trigger, resume));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      submit(form, async () => {
        if (key === 'join') {
          const name = values.displayName.trim();
          if (!name) throw new Error('Inserisci il nome da mostrare.');
          const active = await networkService.signup(values.email,values.password,name)
            .catch(() => { throw new Error('Iscrizione non riuscita. Verifica l’indirizzo o riprova tra poco.'); });
          if (!active) {
            openPanel('login', trigger, resume);
            body.querySelector('[data-form-status]').textContent = 'Controlla l’email per confermare l’indirizzo. Dopo la conferma torna qui e accedi.';
            return;
          }
        } else {
          await networkService.login(values.email,values.password)
            .catch(() => { throw new Error('Controlla email e password e verifica di aver confermato l’indirizzo.'); });
        }
        await loadMember(values.displayName);
        if (!member) throw new Error('Il profilo non è disponibile.');
        await loadNetwork().catch(() => notice('Aggiornamento del feed non riuscito.'));
        if (resume) {
          dialog.addEventListener('close', resume, {once:true});
          dialog.close();
        } else openPanel('publish', trigger);
      });
    });
  }
  if (key === 'profile') {
    const form = body.querySelector('form');
    const profile = profiles.find(item => item.owner === networkService.id());
    if (profile) for (const field of ['name','kind','city','description','phone','whatsapp','email']) form.elements[field].value = profile[field] || '';
    form.elements.kind.value = trigger?.dataset.profileKind || profile?.kind || 'Associazione';
    form.elements.public.checked = Boolean(profile?.visible);
    form.addEventListener('submit', event => {
      event.preventDefault();
      submit(form, async () => {
        const {name,kind,city,description,phone,whatsapp,email,public:visible} = Object.fromEntries(new FormData(form));
        const owner = networkService.id();
        await networkService.put('profiles',{owner,name,kind,city,description});
        await networkService.put('contacts',{owner,phone,whatsapp,email,visible:Boolean(visible)});
        dialog.close();
        notice('Scheda salvata.');
        await loadNetwork().catch(() => notice('Scheda salvata. Ricarica per visualizzarla.'));
      });
    });
  }
  if (key === 'privacy') {
    const link = el('a', 'Leggi privacy e regole di VPET');
    link.href = '/network/privacy.html';
    body.append(link);
  }
  if (key === 'admin') {
    body.append(el('p','Recapiti delle realtà e moderazione dei contenuti.'));
    for (const profile of profiles) {
      const card = el('article', '', 'card');
      card.append(el('h3', profile.name), el('p', profile.kind + ' · ' + profile.city, 'meta'));
      appendContacts(card, profile);
      body.append(card);
    }
    const moderation = async action => {
      try {
        await action();
        dialog.close();
        await loadNetwork();
      } catch { notice('Operazione non riuscita. Riprova.'); }
    };
    for (const post of posts) {
      const card = el('article', '', 'card');
      const note = el('input');
      note.maxLength = 500;
      note.value = notes.get(post) || '';
      note.setAttribute('aria-label', 'Integrazione della redazione');
      card.append(el('h3', post.title), note,
        button('Salva nota Pet Carpet', () => moderation(() => networkService.put('notes',{post_id:post.id,message:note.value.trim()}))),
        button('Rimuovi post', () => moderation(async () => {
          await networkService.rest('posts','?id=eq.' + post.id,{method:'DELETE'});
          if (post.media) await networkService.removeMedia(post.media);
        })));
      for (const comment of comments.get(post) || []) {
        card.append(el('p', comment.author + ' · ' + comment.message),
          button('Rimuovi commento', () => moderation(() => networkService.rest('comments','?id=eq.' + comment.id,{method:'DELETE'}))));
      }
      body.append(card);
    }
  }
  if (!dialog.open) dialog.showModal();
  body.querySelector('input:not([type=checkbox]), textarea, button')?.focus();
}
document.querySelectorAll('[data-open]').forEach(item => item.addEventListener('click', () => openPanel(item.dataset.open, item)));
document.querySelectorAll('[data-filter]').forEach(item => item.addEventListener('click', () => {
  filter = item.dataset.filter;
  openedPost = undefined;
  updateFilters();
  renderFeed();
}));
byId('territory').addEventListener('input', () => {
  openedPost = undefined;
  renderFeed();
});
function searchOpportunities() {
  openedPost = undefined;
  filter = 'opportunità';
  updateFilters();
  renderFeed();
  byId('territory').scrollIntoView({block:'center'});
  byId('territory').focus({preventScroll:true});
}
byId('display-search').addEventListener('click', searchOpportunities);
byId('recent-search').addEventListener('click', searchOpportunities);
byId('display-prev').addEventListener('click', () => moveDisplay(-1));
byId('display-next').addEventListener('click', () => moveDisplay(1));
byId('display-pause').addEventListener('click', event => {
  displayPaused = !displayPaused;
  event.currentTarget.textContent = displayPaused ? 'Riprendi' : 'Pausa';
  event.currentTarget.setAttribute('aria-pressed',String(displayPaused));
  scheduleDisplay();
});
const display = byId('network-display');
display.addEventListener('mouseenter', scheduleDisplay);
display.addEventListener('mouseleave', scheduleDisplay);
display.addEventListener('focusin', scheduleDisplay);
display.addEventListener('focusout', () => setTimeout(scheduleDisplay,0));
document.addEventListener('visibilitychange', scheduleDisplay);
byId('close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  cleanupMedia();
  previousFocus?.focus();
});
const publishButton = document.querySelector('[data-publish]');
document.querySelectorAll('[data-publish],[data-opportunity]').forEach(control => {
  control.addEventListener('click', () => openPanel('publish', control));
});
renderFeed();
renderProfiles();
byId('sign-out').addEventListener('click', async () => {
  await networkService.logout().catch(() => {});
  location.reload();
});
(async () => {
  const discovery = networkService.googleAvailable().then(value => {
    googleAvailable = value;
    if (value && dialog.open) body.querySelector('[data-google-entry]')?.removeAttribute('hidden');
  });
  let destination;
  try { destination = await networkService.googleReturn(); }
  catch { notice('Accesso Google interrotto. Riprova da Iscriviti e pubblica.'); }
  try {
    if (!destination) await networkService.restore();
    await loadMember();
    await loadNetwork();
  } catch {
    notice('Il network non è disponibile in questo momento. Riprova tra poco.');
    byId('recent-status').textContent = 'Richieste e offerte al momento non disponibili.';
  }
  await discovery;
  if (destination) {
    const isProfile = ['professionista','profile'].includes(destination);
    const opportunity = opportunityTypes[destination];
    const trigger = opportunity ? document.querySelector('[data-opportunity="' + opportunity + '"]') :
      destination === 'professionista' ? document.querySelector('[data-profile-kind=Professionista]') :
      isProfile ? document.querySelector('[data-open=profile]') : publishButton;
    const next = () => openPanel(isProfile ? 'profile' : 'publish', trigger);
    if (member) next();
    else openPanel('google-profile', trigger, next);
  } else if (!member && new URLSearchParams(location.search).has('iscriviti')) openPanel('join', publishButton);
})();
