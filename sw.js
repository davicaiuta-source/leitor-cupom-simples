// Service worker do Leitor de Cupom Fiscal.
// - A página (index.html) vem SEMPRE da internet quando há conexão: atualizações chegam na hora.
//   Sem internet, abre a última versão guardada.
// - Ícones, manifest e bibliotecas de fora (leitor de QR, fontes, Firebase) ficam guardados para abrir rápido.
// - Dados (Firebase/Firestore, proxy da nota, e-mails) nunca passam pelo cache: o Firestore já guarda
//   as notas no aparelho por conta própria.
const CACHE = 'leitor-cupom-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
// bibliotecas de fora que podem ser guardadas
const STATIC_HOSTS = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const FIREBASE_SDK = /^https:\/\/www\.gstatic\.com\/firebasejs\//;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // página: internet primeiro, cópia guardada se estiver sem conexão
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isStatic = (sameOrigin && /\.(png|json|js)$/.test(url.pathname) && !url.pathname.endsWith('sw.js')) ||
    STATIC_HOSTS.includes(url.hostname) || FIREBASE_SDK.test(req.url);
  if (!isStatic) return; // dados: vai direto para a internet

  // estáticos: usa o guardado e atualiza em segundo plano
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const fresh = fetch(req)
          .then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; })
          .catch(() => cached);
        return cached || fresh;
      })
    )
  );
});
