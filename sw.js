const CACHE = 'vivi-v2';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Não interceptar chamadas de API (Anthropic ou Proxy)
  if (e.request.url.includes('api.anthropic.com') || e.request.url.includes('corsproxy.io')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => {
      if (e.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    }))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Vivi', body: 'Você tem um lembrete!' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'vivi-reminder',
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'done', title: '✅ Concluído' },
        { action: 'snooze', title: '⏰ Lembrar em 10 min' }
      ]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'snooze') {
    setTimeout(() => {
      self.registration.showNotification('Vivi — Lembrete', {
        body: e.notification.body,
        icon: '/icon-192.png',
        tag: 'vivi-snooze'
      });
    }, 10 * 60 * 1000);
  }
  e.waitUntil(clients.openWindow('/'));
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body, icon: '/icon-192.png', badge: '/icon-192.png',
        vibrate: [200, 100, 200], tag: 'vivi-task-' + Date.now(),
        renotify: true, requireInteraction: true,
        actions: [
          { action: 'done', title: '✅ Concluído' },
          { action: 'snooze', title: '⏰ Lembrar em 10 min' }
        ]
      });
    }, delay);
  }
});
