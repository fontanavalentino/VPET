self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>VPET offline</title><h1>Connessione assente</h1><p>Ricollegati a Internet per aprire VPET.</p><a href="/network/">Riprova</a></html>',
    {headers:{'Content-Type':'text/html; charset=utf-8'}}
  )));
});
