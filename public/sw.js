// Service Worker — Mindes PWA
const CACHE = "mindes-v2";
const SHELL = ["/", "/index.html"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
    ])
  );
});

self.addEventListener("fetch", e => {
  const { request } = e;
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  // Не кешируем Firebase / Firestore / auth запросы
  if (
    request.url.includes("firestore") ||
    request.url.includes("firebase") ||
    request.url.includes("googleapis") ||
    request.url.includes("gstatic")
  ) return;

  // Навигационные запросы (переход по URL, рефреш) → всегда отдаём index.html
  // Это ключевой момент для SPA: /projectId, /projectId/taskId → index.html
  if (request.mode === "navigate") {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match("/index.html").then(cached => {
          const network = fetch("/index.html").then(res => {
            if (res && res.status === 200) cache.put("/index.html", res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Всё остальное (ассеты, шрифты и т.д.) — stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request).then(cached => {
        const network = fetch(request).then(res => {
          if (res && res.status === 200 && res.type !== "opaque") {
            cache.put(request, res.clone());
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});
