self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('project-ball-v1').then((cache) => {
      return cache.addAll([
        '/manifest.webmanifest',
        '/favicon.svg',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Use Network First strategy for all requests to ensure dynamic HTMX content is fresh
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Project Ball";
  const options = {
    body: data.body || "Atualização nas suas partidas!",
    icon: '/favicon.svg',
    badge: '/favicon.svg'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
