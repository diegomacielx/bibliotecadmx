/**
 * Service Worker — cache exclusivo de capas GitHub.
 * Não intercepta YouTube, Firebase, API ou assets do app.
 */
const CACHE_NAME = 'dmx-covers-v1';
const COVER_URL =
  /^https:\/\/raw\.githubusercontent\.com\/diegomacielx\/(bibliotecadmx|dmx)\//i;

function isCoverRequest(url) {
  return COVER_URL.test(url);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('dmx-covers-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (!isCoverRequest(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);

      if (cached) {
        fetch(event.request)
          .then(async (response) => {
            if (response.ok) await cache.put(event.request, response.clone());
          })
          .catch(() => {});
        return cached;
      }

      const response = await fetch(event.request);
      if (response.ok) {
        await cache.put(event.request, response.clone());
      }
      return response;
    })()
  );
});
