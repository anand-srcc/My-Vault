// The Vault — Service Worker
// Caches the app shell so "Add to Home Screen" opens instantly and works
// offline for the UI (actual data still needs internet, since it lives in Supabase).

const CACHE_NAME = 'vault-shell-v1';
const SHELL_FILES = [
  'index.html',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the HTML shell (so you always get the latest features),
// falling back to cache when offline. Everything else (Supabase API calls,
// CDN scripts) is left untouched — the browser/network handles those normally.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f));

  if (isShellFile) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
