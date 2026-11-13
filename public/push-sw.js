// Custom Service Worker extension for Web Push (VAPID) notifications
self.addEventListener('push', function (event) {
  let payload = {
    title: 'IBAT OP',
    body: 'You have a new update in IBAT OP.',
    icon: '/assets/aistudio/Ibat_Logo__2___1__de631039.png',
    badge: '/assets/aistudio/Ibat_Logo__2___1__de631039.png',
    url: '/',
    tag: 'approval-notification',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/assets/aistudio/Ibat_Logo__2___1__de631039.png',
    badge: payload.badge || '/assets/aistudio/Ibat_Logo__2___1__de631039.png',
    tag: payload.tag || 'approval-notification',
    renotify: true,
    data: {
      url: payload.url || '/',
      relatedRequestId: payload.relatedRequestId || null,
      relatedGroupId: payload.relatedGroupId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl,
            data: event.notification.data,
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
