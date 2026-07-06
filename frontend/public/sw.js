const CACHE_PREFIX = "filtory-static-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;

const PRECACHE_PATHS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const SENSITIVE_PATH_PREFIXES = [
  "/api/",
  "/auth",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/find-id",
  "/verify-email",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_PATHS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) &&
                cacheName !== CACHE_NAME
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldSkipRequest(request, url) {
  if (request.method !== "GET") {
    return true;
  }

  if (url.origin !== self.location.origin) {
    return true;
  }

  if (request.headers.has("authorization")) {
    return true;
  }

  return SENSITIVE_PATH_PREFIXES.some((path) => url.pathname.startsWith(path));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldSkipRequest(request, url) || !PRECACHE_PATHS.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || fetch(request))
  );
});
