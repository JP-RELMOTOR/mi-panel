// Service worker · Mi Panel
const CACHE = 'panel-v1'

self.addEventListener('install', (e) => {
  // precache del index para que el arranque offline funcione
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add('./index.html'))
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // No interceptar Firebase (datos en vivo + handler de auth) ni la API de Anthropic
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('anthropic.com')
  )
    return

  // Navegación: SIEMPRE revalidar contra la red (evita quedar pegado en una
  // versión vieja); respaldo al index cacheado si no hay internet.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  // Recursos (JS/CSS con hash, etc.): caché primero
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        }),
    ),
  )
})
