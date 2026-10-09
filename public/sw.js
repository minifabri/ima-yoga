// Service worker del gestionale: serve solo alle notifiche push (nessuna
// cache offline). Il payload arriva da src/lib/push.ts.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // payload non JSON: si mostra comunque una notifica generica, perché
    // iOS revoca il permesso a chi riceve push senza mostrare nulla
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "ima yoga", {
      body: data.body || "",
      icon: "/icons/admin-192.png",
      badge: "/icons/admin-192.png",
      tag: data.tag,
      data: { url: data.url || "/admin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && client.url !== url) await client.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
