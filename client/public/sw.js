/**
 * CSPP Alumni — service worker minimal dédié aux notifications push.
 *
 * Rôle unique : recevoir les évènements `push` envoyés par le serveur (voir
 * server/push.ts) et afficher une vraie notification système, même quand
 * l'application n'est pas ouverte dans un onglet ni au premier plan — c'est
 * précisément ce que permet un service worker par rapport à une simple
 * notification web classique.
 *
 * Volontairement pas de stratégie de cache ici : l'app reste 100% en ligne,
 * ce fichier ne fait qu'ajouter la capacité "push".
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "CSPP Alumni", body: "Vous avez une nouvelle notification.", link: "/" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { link: data.link || "/" },
  };

  event.waitUntil(self.registration.showNotification(data.title || "CSPP Alumni", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.link || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      for (const client of clientList) {
        if ("focus" in client && "navigate" in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
