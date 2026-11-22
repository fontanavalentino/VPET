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
const sharedPostId = new URLSearchParams(location.search).get('post');
const validSharedPost = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(sharedPostId);
const profileKinds = {azienda:'Azienda',professionista:'Professionista'};
const proposalKinds = {...profileKinds,opera:'Opera solidale',iniziativa:'Iniziativa solidale'};
const opportunityTypes = {request:'Cerchiamo',offer:'Offriamo'};
const cultureLinkLabel = 'Link del progetto: ';
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
  const postFields = '?select=*,network_members(name),network_resolutions(thanks,resolved_at)';
  const [newPosts, newProfiles, newComments, newNotes, contacts, sharedPosts] = await Promise.all([
    networkService.rest('posts', postFields + '&order=created_at.desc&limit=150'),
    networkService.rest('profiles', '?order=name.asc&limit=500'),
    networkService.rest('comments', '?select=*,network_members(name)&order=created_at.asc&limit=2000'),
    networkService.rest('notes', '?select=*'),
    networkService.rest('contacts', '?select=*&limit=500'),
    validSharedPost ? networkService.rest('posts',postFields + '&id=eq.' + sharedPostId) : []
  ]);
  const contactsByOwner = new Map(contacts.map(row => [row.owner, row]));
  const uniquePosts = new Map([...newPosts, ...sharedPosts].map(row => [row.id,row]));
  posts.splice(0, posts.length, ...Array.from(uniquePosts.values(), row => ({
    ...row, author:row.network_members.name, resolution:Array.isArray(row.network_resolutions) ? row.network_resolutions[0] : row.network_resolutions
  })));
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
  renderEditorial('Opere solidali','culture-posts');
  renderEditorial('Iniziative solidali','initiative-posts');
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
  document.querySelector('[data-opportunity="Opere solidali"]').hidden = !moderator;
  document.querySelector('[data-publish]').textContent = member ? 'Pubblica' : 'Iscriviti e pubblica';
  byId('sign-out').hidden = !member;
  byId('join-network').hidden = Boolean(member);
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
  displayPosts = posts.filter(post => isOpportunity(post) && !post.resolution && associations.has(post.owner)).map(post => ({
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
  const recent = posts.filter(post => isOpportunity(post) && !post.resolution && !post.sample).slice(0,4);
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
function renderEditorial(type,target) {
  const cards = posts.filter(post => post.type === type).slice(0,4).map(post => {
    const card = el('article','','card');
    const open = button('Scopri il progetto',() => openPost(post));
    card.append(el('h3',post.title),el('p',post.city,'meta'),open);
    return card;
  });
  byId(target).replaceChildren(...cards);
}
function sharePost(post, card) {
  const url = new URL('/#network',location.origin);
  url.searchParams.set('post',post.id);
  const sourceUrl = source => {
    const tagged = new URL(url);
    tagged.searchParams.set('da',source);
    return tagged.href;
  };
  const whatsapp = el('a','WhatsApp','contact');
  whatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(post.title + '\n' + sourceUrl('whatsapp'));
  const facebook = el('a','Facebook','contact');
  facebook.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(sourceUrl('facebook'));
  for (const link of [whatsapp,facebook]) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  const status = el('p','','hint');
  status.setAttribute('role','status');
  const copy = button('Copia link',async () => {
    try {
      await navigator.clipboard.writeText(sourceUrl('link'));
      status.textContent = 'Link copiato.';
    } catch {
      const field = el('input');
      field.readOnly = true;
      field.value = sourceUrl('link');
      field.setAttribute('aria-label','Link al post');
      status.replaceChildren(field);
      field.focus();
      field.select();
    }
  });
  const actions = el('div','','post-share');
  if (navigator.share) {
    actions.append(button('Condividi con un’app', async () => {
      try { await navigator.share({title:post.title,url:sourceUrl('share')}); }
      catch (error) {
        if (error.name !== 'AbortError') status.textContent = 'Puoi condividere il post usando Copia link.';
      }
    }));
  }
  actions.append(copy,whatsapp,facebook);
  const details = el('details','','share-details');
  details.append(el('summary','Condividi il post'),actions,status);
  card.append(details);
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
      const sections = byId('feed').querySelectorAll('.comments');
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
function cultureLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return url.href;
  } catch {}
  return '';
}
function renderFeed() {
  const city = byId('territory').value.trim().toLocaleLowerCase('it');
  const matches = posts.filter(post => {
    const categoryMatches = filter === 'risolti' ? Boolean(post.resolution) :
      filter === 'opportunità' ? isOpportunity(post) :
      filter ? post.type === filter : city || !isOpportunity(post);
    if (!openedPost && post.resolution && ['opportunità','Cerchiamo'].includes(filter)) return false;
    return (!openedPost || post.id === openedPost) && categoryMatches && post.city.toLocaleLowerCase('it').includes(city);
  });
  byId('results').textContent = matches.length ? matches.length + (matches.length === 1 ? ' post' : ' post trovati') : 'Non ci sono ancora post per questa ricerca.';
  byId('feed').replaceChildren(...matches.map(post => {
    const card = el('article', '', 'card');
    card.dataset.post = String(posts.indexOf(post));
    card.id = 'post-' + post.id;
    card.tabIndex = -1;
    card.append(el('div', post.type + (post.sample ? ' · Esempio' : ''), 'tag'), el('h3', post.title),
      el('div', [post.author, post.city, postDate(post)].filter(Boolean).join(' · '), 'meta'));
    const lines = post.body.split('\n');
    const lastLine = lines.at(-1);
    const projectUrl = ['Opere solidali','Iniziative solidali'].includes(post.type) && lastLine.startsWith(cultureLinkLabel) ?
      cultureLink(lastLine.slice(cultureLinkLabel.length)) : '';
    card.append(el('p',projectUrl ? lines.slice(0,-1).join('\n').trimEnd() : post.body));
    if (projectUrl) {
      const project = el('a','Vai al progetto o all’acquisto','contact');
      project.href = projectUrl;
      project.target = '_blank';
      project.rel = 'noopener noreferrer';
      card.append(project);
    }
    if (post.resolution) {
      const result = el('div','','post-resolution');
      result.append(el('strong','Aiuto ricevuto'));
      if (post.resolution.thanks) result.append(el('p',post.resolution.thanks));
      card.append(result);
    } else if (member && post.owner === networkService.id() && post.type === 'Cerchiamo') {
      card.append(button('Aiuto ricevuto',event => openPanel('resolve',event.currentTarget,undefined,post)));
    }
    sharePost(post,card);
    if (openedPost && !member) {
      const join = button('Iscriviti e partecipa',event => openPanel('join',event.currentTarget,welcomeNetwork));
      join.setAttribute('data-join-network','');
      join.classList.add('primary','shared-post-join');
      card.append(join);
    }
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
  const publicProfiles = profiles.filter(profile => !Object.values(profileKinds).includes(profile.kind));
  if (!publicProfiles.length) directory.append(el('p', 'Presenta la tua realtà per creare la prima scheda.'));
  for (const profile of publicProfiles) {
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
function setupComposer(form, preferredType, approvedProposal) {
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
    byId('post-title-label').textContent = type === 'Cerchiamo' ? 'Cosa ti serve?' :
      type === 'Offriamo' ? 'Cosa puoi offrire?' : 'Titolo';
    byId('post-body-label').textContent = opportunity ? 'Dettagli per organizzarsi' : 'Raccontaci';
    form.elements.body.placeholder = opportunity ? 'Indica quantità, disponibilità o modalità di ritiro.' : '';
    form.elements.date.required = isEvent;
    byId('event-date').hidden = !isEvent && !opportunity;
    byId('culture-link').hidden = !['Opere solidali','Iniziative solidali'].includes(type);
    form.elements.culture_url.disabled = byId('culture-link').hidden;
    byId('post-date-label').textContent = isEvent ? 'Data dell’evento' : 'Entro quando (facoltativo)';
    const isExperience = form.elements.type.value === 'Esperienze';
    byId('experience-fields').hidden = !isExperience;
    form.elements.partner.required = isExperience;
    form.elements.outcome.required = isExperience;
  }
  if (moderator) form.elements.type.append(el('option','Opere solidali'));
  if (approvedProposal) {
    form.elements.type.append(el('option','Iniziative solidali'));
    form.elements.city.value = approvedProposal.city;
    form.elements.type.disabled = true;
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
      const {city,title,body,date,partner,outcome,culture_url} = Object.fromEntries(new FormData(form));
      const type = form.elements.type.value;
      const url = culture_url ? cultureLink(culture_url.trim()) : '';
      if (culture_url && !url) throw new Error('Inserisci un link che inizi con https://.');
      const description = url ? body.trimEnd() + '\n\n' + cultureLinkLabel + url : body;
      if (description.length > 2000) throw new Error('Accorcia la descrizione per lasciare spazio al link.');
      const post = {city,type,title,body:description,owner:networkService.id(),date:(type === 'Eventi' || isOpportunity({type})) ? date || null : null,
        partner:type === 'Esperienze' ? partner : null,outcome:type === 'Esperienze' ? outcome : null};
      if (approvedProposal) post.approved_proposal_id = approvedProposal.id;
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
  if (navigator.share) {
    byId('copy-invite').after(button('Condividi con un’app', async () => {
      try { await navigator.share({title:'Un invito a VPET Network',text:message.slice(0,-url.href.length).trim(),url:url.href}); }
      catch (error) {
        if (error.name !== 'AbortError') byId('invite-status').textContent = 'Puoi invitare altre persone usando Copia link.';
      }
    }));
  }
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
const reportMetrics = {
  openings:'Aperture del Network',members:'Iscritti',requests:'Richieste',offers:'Offerte',resolved:'Aiuti ricevuti',
  proposals:'Proposte di collaborazione e iniziative',culture_proposals:'Proposte culturali',culture_published:'Opere pubblicate'
};
const reportChannels = {diretto:'Diretto o non attribuito',whatsapp:'WhatsApp',facebook:'Facebook',instagram:'Instagram',
  qr:'QR code',link:'Link copiato',share:'Condivisione dal dispositivo',invito:'Inviti alla rete'};
function setupReport() {
  const section = byId('report').content.cloneNode(true).querySelector('section');
  const selector = section.querySelector('select');
  const status = section.querySelector('[data-report-status]');
  const output = section.querySelector('[data-report-contents]');
  const download = section.querySelector('[data-report-export]');
  for (let week = 0; week < 12; week++) {
    const option = el('option',week === 0 ? 'Settimana in corso' : week === 1 ? 'Ultima settimana completa' : week + ' settimane fa');
    option.value = week;
    selector.append(option);
  }
  let report;
  let generation = 0;
  async function refresh() {
    const version = ++generation;
    status.textContent = 'Caricamento del report…';
    output.replaceChildren();
    download.hidden = true;
    try {
      const data = await networkService.rpc('weekly_report',{weeks_ago:Number(selector.value)});
      if (version !== generation || !section.isConnected) return;
      report = data;
      const from = dateFormat.format(new Date(data.from));
      const to = dateFormat.format(new Date(data.to));
      const table = el('table');
      const head = table.createTHead().insertRow();
      for (const label of ['Indicatore','Settimana','Totale']) {
        const heading = el('th',label);
        heading.scope = 'col';
        head.append(heading);
      }
      const rows = table.createTBody();
      const noTracking = !data.tracking_from || data.to < data.tracking_from;
      for (const [key,label] of Object.entries(reportMetrics)) {
        const row = rows.insertRow();
        row.append(el('td',label),el('td',key === 'openings' && noTracking ? '–' : String(data.week[key])),
          el('td',String(data.total[key])));
      }
      const summary = el('p','Collaborazioni attive oggi ' + data.active_partnerships + ' · Contatti da seguire entro 7 giorni ' + data.next_contacts);
      const sources = el('ul','','report-channels');
      for (const [key,value] of Object.entries(data.channels).sort((a,b) => b[1]-a[1])) {
        sources.append(el('li',(reportChannels[key] || key) + ' · ' + value));
      }
      output.append(el('h4',from + ' – ' + to),table,summary);
      if (sources.childElementCount) output.append(el('h4','Da dove arrivano le aperture'),sources);
      const note = 'Le aperture sono conteggi aggregati di pagina. Una persona può generare più aperture.';
      output.append(el('p',data.tracking_from ? note + ' Dati dal ' + dateFormat.format(new Date(data.tracking_from)) + '.' :
        'I dati sulle aperture compariranno con le prime visite rilevate.', 'hint'));
      status.textContent = '';
      download.hidden = false;
    } catch {
      if (version === generation) status.textContent = 'Report non disponibile. Cambia settimana o riapri la rubrica per riprovare.';
    }
  }
  selector.addEventListener('change',refresh);
  download.addEventListener('click',() => {
    const csv = ['Indicatore;Settimana;Totale',...Object.entries(reportMetrics).map(([key,label]) =>
      [label,key === 'openings' && (!report.tracking_from || report.to < report.tracking_from) ? '' : report.week[key],report.total[key]].join(';'))];
    const url = URL.createObjectURL(new Blob(['\uFEFF',csv.join('\n')],{type:'text/csv;charset=utf-8;'}));
    const file = el('a');
    file.href = url;
    file.download = 'VPET-report-' + report.from + '.csv';
    file.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  queueMicrotask(refresh);
  return section;
}
function openPanel(key, trigger, resume, post) {
  previousFocus = trigger;
  const currentProfile = profiles.find(item => item.owner === networkService.id());
  if (key === 'publish' && Object.values(profileKinds).includes(currentProfile?.kind)) {
    return openPanel('proposal',trigger);
  }
  if (['publish','profile','proposal'].includes(key) && !member) return openPanel('join', trigger, () => openPanel(key, trigger));
  if (key === 'admin' && !moderator) return;
  const titles = {'google-profile':'Completa il tuo profilo',install:'Installa VPET',login:'Accedi a VPET',join:'Iscriviti e pubblica',publish:'Pubblica nel network',profile:trigger?.dataset.profileKind === 'Azienda' ? 'Presenta la tua azienda' : trigger?.dataset.profileKind ? 'Presentati come professionista' : 'Presenta la tua realtà',resolve:'Aiuto ricevuto',proposal:'Proponi una collaborazione a Pet Carpet',invite:'Invita una realtà',privacy:'Privacy e pubblicazione',admin:'Rubrica e moderazione Pet Carpet'};
  byId('dialog-title').textContent = titles[key];
  body.replaceChildren();
  const template = byId(key);
  if (template) body.append(template.content.cloneNode(true));
  if (key === 'proposal') {
    const form = body.querySelector('form');
    if (currentProfile) {
      for (const field of ['name','city','email']) form.elements[field].value = currentProfile[field] || '';
    }
    form.elements.kind.value = trigger?.dataset.proposalKind || currentProfile?.kind || 'Azienda';
    if (!form.elements.kind.value) form.elements.kind.value = 'Azienda';
    const updateProposalText = () => {
      const kind = form.elements.kind.value;
      const culture = kind === 'Opera solidale';
      const initiative = kind === 'Iniziativa solidale';
      const socialPurpose = culture || initiative;
      form.querySelector('[data-proposal-message]').textContent = initiative ? 'Descrivi l’iniziativa e come verranno destinati i fondi' :
        culture ? 'Titolo, opera e progetto che vuoi sostenere' : 'Come vuoi collaborare?';
      form.querySelector('.culture-proposal-fields').hidden = !socialPurpose;
      for (const name of ['beneficiary','support']) {
        form.elements[name].required = socialPurpose;
        form.elements[name].disabled = !socialPurpose;
      }
      form.elements.message.maxLength = socialPurpose ? 1100 : 1500;
      form.elements.message.placeholder = initiative ? 'Indica chi organizza, obiettivo, modalità di raccolta e un link di riferimento se disponibile.' :
        culture ? 'Descrivi l’opera e aggiungi un link per vederla o ascoltarla, se disponibile.' : '';
      if (culture && trigger?.hasAttribute('data-photography')) {
        form.elements.message.placeholder = 'Descrivi il servizio fotografico, la mostra o le stampe e come si potrà partecipare.';
      }
    };
    updateProposalText();
    form.elements.kind.addEventListener('change',updateProposalText);
    form.addEventListener('submit',event => {
      event.preventDefault();
      submit(form,async () => {
        const {beneficiary,support,message,...fields} = Object.fromEntries(new FormData(form));
        const description = ['Opera solidale','Iniziativa solidale'].includes(fields.kind) ?
          'Beneficiario: ' + beneficiary.trim() + '\nContributo: ' + support.trim() + '\n\n' + message.trim() : message.trim();
        await networkService.rest('proposals','',{method:'POST',value:{...fields,message:description,owner:networkService.id()}});
        dialog.close();
        notice('Proposta inviata a Pet Carpet.');
      });
    });
  }
  if (key === 'resolve') {
    const form = body.querySelector('form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      submit(form,async () => {
        const thanks = form.elements.thanks.value.trim();
        await networkService.rest('resolutions','',{method:'POST',value:{post_id:post.id,thanks},
          prefer:'resolution=ignore-duplicates,return=minimal'});
        dialog.close();
        notice('Aiuto ricevuto. La richiesta è tra gli Aiuti riusciti.');
        filter = 'risolti';
        openedPost = undefined;
        byId('territory').value = '';
        updateFilters();
        await loadNetwork().catch(() => notice('Esito salvato. Ricarica per aggiornare il Network.'));
        const result = byId('post-' + post.id);
        result?.scrollIntoView({block:'start'});
        result?.focus({preventScroll:true});
      });
    });
  }
  if (key === 'install' && installPrompt) {
    const control = byId('install-app');
    control.hidden = false;
    control.addEventListener('click', async () => {
      await installPrompt?.prompt();
      installPrompt = undefined;
      control.hidden = true;
    });
  }
  if (key === 'publish') setupComposer(body.querySelector('form'), post?.kind === 'Iniziativa solidale' ? 'Iniziative solidali' : trigger?.dataset.opportunity,post);
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
        const profile = Object.keys(profileKinds).find(key => profileKinds[key] === trigger?.dataset.profileKind);
        const proposal = trigger?.hasAttribute('data-photography') ? 'foto' : Object.keys(proposalKinds).find(key => proposalKinds[key] === trigger?.dataset.proposalKind);
        const destination = trigger?.hasAttribute('data-join-network') ? 'join-network' : proposal ? 'proposta-' + proposal : profile || (
          trigger?.dataset.open === 'profile' ? 'profile' : opportunity || 'publish');
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
    const updateContactPrivacy = () => {
      const isPrivate = Object.values(profileKinds).includes(form.elements.kind.value);
      form.elements.public.disabled = isPrivate;
      form.elements.public.closest('label').hidden = isPrivate;
      form.querySelector('[data-profile-privacy]').textContent = isPrivate ?
        'I dati di aziende e professionisti restano nella rubrica riservata di Pet Carpet.' :
        'I recapiti sono accessibili alla redazione di Pet Carpet e appaiono nella scheda solo se scegli di mostrarli.';
    };
    updateContactPrivacy();
    form.elements.kind.addEventListener('change',updateContactPrivacy);
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
    const inbox = el('section','','proposal-inbox');
    const proposalList = el('div','','proposal-list');
    const loading = el('p','Caricamento delle proposte…','hint');
    loading.setAttribute('role','status');
    inbox.append(el('h3','Proposte di collaborazione'),loading,proposalList);
    body.append(setupReport(),inbox,el('p','Recapiti delle realtà e moderazione dei contenuti.'));
    networkService.rest('proposals','?select=*,network_proposal_followups(status,next_contact,internal_note)&order=created_at.desc&limit=100').then(rows => {
      if (!inbox.isConnected) return;
      loading.textContent = rows.length ? '' : 'Nessuna proposta ricevuta.';
      for (const row of rows) {
        const proposal = el('article','','card');
        const reply = el('a','Rispondi via email','contact');
        reply.href = 'mailto:' + encodeURIComponent(row.email) + '?subject=' + encodeURIComponent('Proposta di collaborazione · Pet Carpet');
        const followup = byId('followup').content.cloneNode(true);
        const summary = followup.querySelector('summary');
        const form = followup.querySelector('form');
        const status = form.querySelector('[data-form-status]');
        const saved = row.network_proposal_followups;
        const publishInitiative = button('Pubblica l’iniziativa autorizzata',event => openPanel('publish',event.currentTarget,undefined,row));
        const alreadyPublished = posts.some(post => post.approved_proposal_id === row.id);
        function updateInitiativePublication(state) {
          publishInitiative.hidden = row.kind !== 'Iniziativa solidale' || alreadyPublished || !['Autorizzata','Attiva'].includes(state);
        }
        updateInitiativePublication(saved?.status);
        for (const field of ['status','next_contact','internal_note']) {
          if (saved?.[field]) form.elements[field].value = saved[field];
        }
        const updateSummary = () => {
          const date = form.elements.next_contact.value;
          summary.textContent = form.elements.status.value + (date ?
            ' · Prossimo contatto il ' + dateFormat.format(new Date(date)) : ' · Gestisci collaborazione');
        };
        updateSummary();
        form.addEventListener('submit',event => {
          event.preventDefault();
          submit(form,async () => {
            const {status:state,next_contact,internal_note} = Object.fromEntries(new FormData(form));
            await networkService.put('proposal_followups',{proposal_id:row.id,status:state,next_contact:next_contact || null,
              internal_note:internal_note.trim()});
            updateSummary();
            updateInitiativePublication(state);
            status.textContent = 'Aggiornamento salvato.';
          });
        });
        proposal.append(el('h4',row.name),el('p',row.kind + ' · ' + row.city,'meta'),
          el('p',row.message),reply,followup,publishInitiative);
        proposalList.append(proposal);
      }
    }).catch(() => {
      if (inbox.isConnected) loading.textContent = 'Le proposte non sono disponibili. Riapri la rubrica per riprovare.';
    });
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
const joinButton = byId('join-network');
function welcomeNetwork() {
  const url = new URL(location.href);
  url.searchParams.delete('iscriviti');
  if (publishButton.getRootNode() !== document) url.hash = 'network';
  history.replaceState(null,'',url.pathname + url.search + url.hash);
  if (dialog.open) dialog.close();
  notice('Ora fai parte della rete. Puoi pubblicare, commentare e invitare chi può aiutare.');
  const status = byId('network-status');
  status.scrollIntoView({block:'center'});
}
joinButton.addEventListener('click',() => openPanel('join',joinButton,welcomeNetwork));
document.querySelectorAll('[data-network-jump]').forEach(link => link.addEventListener('click',event => {
  event.preventDefault();
  const heading = byId(link.hash.slice(1)).querySelector('h2');
  heading.scrollIntoView({block:'start'});
  heading.focus({preventScroll:true});
}));
document.querySelectorAll('[data-publish],[data-opportunity]').forEach(control => {
  control.addEventListener('click', () => openPanel('publish', control));
});
renderFeed();
renderProfiles();
const networkHost = publishButton.getRootNode().host;
const viewQuery = new URLSearchParams(location.search);
let openingRecorded = false;
function recordOpening() {
  if (openingRecorded || document.hidden || networkHost?.hidden) return;
  openingRecorded = true;
  const source = viewQuery.get('da') || (viewQuery.has('iscriviti') ? 'invito' : 'diretto');
  networkService.rpc('record_opening',{source}).catch(() => {});
}
if (networkHost) new MutationObserver(recordOpening).observe(networkHost,{attributeFilter:['hidden']});
document.addEventListener('visibilitychange',recordOpening);
recordOpening();
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
    const profileKind = profileKinds[destination];
    const photoProposal = destination === 'proposta-foto';
    const proposalKind = photoProposal ? 'Opera solidale' :
      destination.startsWith('proposta-') ? proposalKinds[destination.slice('proposta-'.length)] : undefined;
    const isProfile = Boolean(profileKind) || destination === 'profile';
    const opportunity = opportunityTypes[destination];
    const trigger = destination === 'join-network' ? joinButton : photoProposal ? document.querySelector('[data-photography]') : proposalKind ? document.querySelector('[data-proposal-kind="' + proposalKind + '"]') :
      opportunity ? document.querySelector('[data-opportunity="' + opportunity + '"]') :
      profileKind ? document.querySelector('[data-profile-kind="' + profileKind + '"]') :
      isProfile ? document.querySelector('[data-open=profile]') : publishButton;
    const next = destination === 'join-network' ? welcomeNetwork :
      () => openPanel(proposalKind ? 'proposal' : isProfile ? 'profile' : 'publish', trigger);
    if (member) next();
    else openPanel('google-profile', trigger, next);
  } else if (validSharedPost) {
    const post = posts.find(item => item.id === sharedPostId);
    if (post) openPost(post);
    else notice('Questo post non è disponibile. Puoi consultare le altre richieste e offerte.');
  } else if (!member && new URLSearchParams(location.search).has('iscriviti')) openPanel('join',joinButton,welcomeNetwork);
})();
