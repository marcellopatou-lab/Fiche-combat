/* Service worker — Fiche de combat
   Stratégie : réponse immédiate depuis le cache (hors ligne garanti),
   puis mise à jour silencieuse en arrière-plan. Une nouvelle version
   déposée sur le serveur s'affiche au lancement suivant. */
const CACHE = 'fdc-app-v1';
const FILES = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, {ignoreSearch: true});
    const net = fetch(req, {cache: 'no-cache'})
      .then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; })
      .catch(() => null);
    e.waitUntil(net);
    return hit || (await net) || new Response('Hors ligne', {status: 503});
  })());
});
