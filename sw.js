const CACHE = "planner-v2";

const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/theme.js",
  "js/storage.js",
  "js/planner.js",
  "js/app.js",
  "js/pwa.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// التثبيت: نخزّن ملفات التطبيق كلها
// self.addEventListener("install", (e) => {
//   e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
//   self.skipWaiting();
// });

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        ASSETS.map((url) =>
          c.add(url).catch((err) => console.warn("لم يُخزَّن:", url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// التفعيل: نحذف النسخ القديمة من الكاش
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// الطلبات: نعرض من الكاش فوراً ونحدّثه من الشبكة في الخلفية
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match("index.html"));
      return cached || network;
    })
  );
});