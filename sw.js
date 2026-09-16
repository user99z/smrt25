/* Service Worker — Portal Smart TV
   Estratégia: cache-first para o app shell, sem cachear stream de vídeo. */
const VERSION = 'portal-tv-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Nunca interceptar streams de vídeo nem requisições de lista/iframe
  if (/\.(m3u8|ts|mp4|webm|ogg|mov|mkv)(\?|$)/i.test(url.pathname)) return;
  if (e.request.method !== 'GET') return;
  // Só gerenciar cache para o próprio app (mesma origem); CDN de fontes: stale-while-revalidate
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host)) {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then((cached) => {
        const fetched = fetch(e.request).then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const clone = res.clone();
            caches.open(VERSION).then((c) => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
  }
});
