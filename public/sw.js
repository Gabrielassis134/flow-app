/* Service worker do Flow.
 *
 * Por enquanto serve a dois propósitos:
 *  1. mostrar notificações do sistema também no celular (onde o navegador
 *     só permite notificações criadas por um service worker);
 *  2. abrir ou focar o Flow quando a pessoa clica na notificação.
 *
 * Não guarda nada em cache e não intercepta requisições.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();

          if ("navigate" in client) {
            try {
              await client.navigate(url);
            } catch (error) {
              // Se não for possível navegar, só focar a aba já basta.
            }
          }

          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

// Preparado para lembretes com o Flow fechado (notificações push), que
// ainda não estão ativas: quando existirem, a mensagem chega aqui.
self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {};
  }

  const title = payload.title || "Flow";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      tag: payload.tag,
      icon: "/favicon.ico",
      data: { url: payload.url || "/" },
    }),
  );
});
