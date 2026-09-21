/* Service worker — Fiche de combat (v3)
   Réseau d'abord : connecté, l'application charge toujours la dernière
   version déposée sur GitHub. Réseau absent ou trop lent (2,5 s),
   elle s'ouvre depuis la copie en cache : le hors ligne reste garanti. */
const CACHE = 'fdc-app-v3';
const FILES = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  const net = fetch(req, {cache: 'no-cache'}).then(async r => {
    if (r && r.ok) { const c = await caches.open(CACHE); await c.put(req, r.clone()); }
    return r;
  });
  e.waitUntil(net.then(() => {}, () => {}));

  const slow = new Promise((_, no) => setTimeout(() => no('lent'), 2500));
  e.respondWith(
    Promise.race([net, slow])
      .then(r => (r && r.ok) ? r : Promise.reject('http'))
      .catch(() => caches.match(req, {ignoreSearch: true})
        .then(hit => hit || net.catch(() => new Response('Hors ligne', {status: 503}))))
  );
});
