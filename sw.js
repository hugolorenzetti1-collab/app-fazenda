// Fazenda Lorenzetti — funciona sem internet
const V = 'fl-app-v22';
const BASE = ['./', 'index.html', 'manifest.json', 'pastos.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'fl-tiles').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // API (POST) vai direto
  const url = new URL(req.url);
  if (url.hostname.includes('script.google')) return;
  if (url.hostname === 'server.arcgisonline.com') {         // mapa: usa o que tiver guardado
    e.respondWith(caches.open('fl-tiles').then(c => c.match(req.url).then(r => r || fetch(req).then(resp => {
      if (resp.ok) c.put(req.url, resp.clone());
      return resp;
    }).catch(() => new Response('', {status: 504})))));
    return;
  }
  // app: responde do celular na hora e atualiza por trás quando tiver internet
  e.respondWith(caches.open(V).then(c => c.match(req, {ignoreSearch: true}).then(r => {
    const net = fetch(req).then(resp => { if (resp.ok) c.put(req, resp.clone()); return resp; }).catch(() => r);
    return r || net;
  })));
});
