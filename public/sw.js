// Service Worker — Mindes PWA
const CACHE = "mindes-v5";
const SHELL = ["/", "/index.html", "/privacy.html"];

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
  if (new URL(request.url).origin !== self.location.origin) return;

  // Не кешируем Firebase / Firestore / auth запросы
  if (
    request.url.includes("firestore") ||
    request.url.includes("firebase") ||
    request.url.includes("googleapis") ||
    request.url.includes("gstatic")
  ) return;

  // Навигация сначала получает свежую страницу из сети; кеш нужен для офлайна.
  // Маршруты SPA ведут на index.html, отдельная privacy.html остаётся документом.
  if (request.mode === "navigate") {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const page = new URL(request.url).pathname === "/privacy.html" ? "/privacy.html" : "/index.html";
        try {
          const response = await fetch(page, { cache: "no-store" });
          if (response.ok) await cache.put(page, response.clone());
          return response;
        } catch {
          return (await cache.match(page)) || Response.error();
        }
      })
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
