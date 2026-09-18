const CACHE = 'certiforge-v0.3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/editor.css',
  './css/responsive.css',
  './vendor/xlsx.full.min.js',
  './vendor/jspdf.umd.min.js',
  './vendor/jszip.min.js',
  './js/main.js',
  './js/state.js',
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
  './js/generator.js',
  './js/ui.js',
  './js/history.js',
  './js/storage.js',
  './js/qrcode.js',
  './js/utils.js',
  './js/config.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok && resp.type === 'basic') {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
