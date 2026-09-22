const CACHE = 'certiforge-v0.8.0';
const ASSETS = [
  './',
  './index.html',
  './verify.html',
  './manifest.json',
  './css/main.css',
  './css/editor.css',
  './css/responsive.css',
  './css/atelier.css',
  './css/verify.css',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './vendor/xlsx.full.min.js',
  './vendor/jspdf.umd.min.js',
  './vendor/jszip.min.js',
  './vendor/qrcode.min.js',
  './js/main.js',
  './js/theme.js',
  './js/state.js',
  './js/template-assets.js',
  './js/templates.js',
  './js/template-loader.js',
  './js/variables.js',
  './js/spreadsheet.js',
  './js/mapping.js',
  './js/validator.js',
  './js/canvas.js',
  './js/editor.js',
  './js/pdf.js',
  './js/zip.js',
  './js/project.js',
  './js/security.js',
  './js/progress.js',
  './js/generator.js',
  './js/pdf-worker.js',
  './js/verify.js',
  './js/ui.js',
  './js/history.js',
  './js/storage.js',
  './js/qrcode.js',
  './js/utils.js',
  './js/config.js'
];

const MAX_RUNTIME_ENTRIES = 120;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(a => c.add(a)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(c) {
  const keys = await c.keys();
  if (keys.length <= MAX_RUNTIME_ENTRIES) return;
  const essential = new Set(ASSETS.map(a => new URL(a, self.location.url).href));
  const extras = keys.filter(k => !essential.has(k.url));
  const excess = keys.length - MAX_RUNTIME_ENTRIES;
  await Promise.all(extras.slice(0, excess).map(k => c.delete(k)));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  let url;
  try { url = new URL(e.request.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  // Privacy: query-string URLs (verify.html?id=…&name=…, etc.) are never cached.
  const cacheable = url.search === '';

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp.ok && cacheable && (resp.type === 'basic' || resp.type === 'cors')) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone).then(() => trimCache(c))).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then(r =>
        r
        || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined)
        || new Response('Offline: this resource is not cached.', { status: 503, headers: { 'Content-Type': 'text/plain' } })
      ))
  );
});
