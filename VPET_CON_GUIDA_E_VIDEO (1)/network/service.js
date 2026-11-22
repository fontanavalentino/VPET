'use strict';

const networkService = (() => {
  const endpoint = 'https://enmhknczdgtivjiwszwk.supabase.co';
  const key = 'sb_publishable_ykbUOvps1Ct8EQ2ud-6Fxw_21UUK64v';
  const sessionKey = 'vpet-network-session';
  let session;
  try { session = JSON.parse(sessionStorage.getItem(sessionKey)); } catch {}
  function save(value) {
    session = value;
    if (value) sessionStorage.setItem(sessionKey, JSON.stringify(value));
    else sessionStorage.removeItem(sessionKey);
  }
  async function request(path, {method = 'GET', value, raw, mime, anonymous = false, prefer} = {}) {
    const headers = {apikey:key};
    if (!anonymous && session?.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    if (value !== undefined) headers['Content-Type'] = 'application/json';
    if (mime) headers['Content-Type'] = mime;
    if (prefer) headers.Prefer = prefer;
    const response = await fetch(endpoint + path, {method, headers, body:raw || (value === undefined ? undefined : JSON.stringify(value))});
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.msg || data?.message || 'Richiesta non riuscita');
    return data;
  }
  const rest = (table, query = '', options) => request('/rest/v1/network_' + table + query, options);
  const auth = (path, value) => request('/auth/v1/' + path, {method:'POST',value,anonymous:true});
  return {
    rest,
    id: () => session?.user?.id,
    async restore() {
      if (!session?.refresh_token) return;
      try { save(await auth('token?grant_type=refresh_token', {refresh_token:session.refresh_token})); }
      catch { save(null); }
    },
    async login(email, password) { save(await auth('token?grant_type=password',{email,password})); },
    async signup(email,password,name) {
      const data = await auth('signup', {email,password,data:{display_name:name}});
      if (data.access_token) save(data);
      return Boolean(data.access_token);
    },
    name: () => session?.user?.user_metadata?.display_name,
    async logout() {
      try { await request('/auth/v1/logout?scope=local', {method:'POST'}); }
      finally { save(null); }
    },
    put(table,value) {
      return rest(table,'',{method:'POST',value,prefer:'resolution=merge-duplicates,return=minimal'});
    },
    async upload(file) {
      const path = session.user.id + '/' + crypto.randomUUID();
      await request('/storage/v1/object/network-media/' + path,{method:'POST',raw:file,mime:file.type.split(';')[0]});
      return path;
    },
    async removeMedia(path) {
      await request('/storage/v1/object/network-media',{method:'DELETE',value:{prefixes:[path]}});
    },
    async mediaUrl(path) {
      const data = await request('/storage/v1/object/sign/network-media/' + path,{method:'POST',value:{expiresIn:300}});
      return endpoint + '/storage/v1' + data.signedURL;
    }
  };
})();
