// This service worker is intentionally a no-op that removes itself and clears
// any previously cached assets, so clients always load the latest build.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((client) => client.navigate(client.url));
      } catch (e) {
        // ignore
      }
    })()
  );
});

// No fetch handler: all requests go straight to the network.
