// Spur Service Worker — handles notifications + offline caching

const CACHE = 'spur-v10';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Offline caching — network first, cache fallback
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ============================================
// NOTIFICATIONS
// ============================================
let reminderTimer = null;
let pendingReminders = [];

// Listen for reminders sent from the main app
self.addEventListener('message', (e) => {
  const data = e.data || {};

  if (data.type === 'SCHEDULE_REMINDERS'){
    pendingReminders = data.reminders || [];
    scheduleNext();
  }

  if (data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

function scheduleNext(){
  if (reminderTimer) clearTimeout(reminderTimer);

  const now = Date.now();
  let nextTime = Infinity;
  let nextReminder = null;

  pendingReminders.forEach(r => {
    if (r.done) return;
    if (!r.nextFireAt) return;
    if (r.nextFireAt > now && r.nextFireAt < nextTime){
      nextTime = r.nextFireAt;
      nextReminder = r;
    }
  });

  if (!nextReminder) return;

  const delay = Math.max(0, nextTime - now);
  reminderTimer = setTimeout(() => {
    fireNotification(nextReminder);
    // remove from pending after firing
    pendingReminders = pendingReminders.filter(r => r.id !== nextReminder.id);
    // schedule next
    scheduleNext();
  }, delay);
}

function fireNotification(r){
  const title = 'Spur';
  const options = {
    body: r.title,
    tag: 'spur-' + r.id,
    renotify: true,
    requireInteraction: false,
    data: { url: './', id: r.id },
    icon: undefined,
    badge: undefined,
    silent: false
  };
  self.registration.showNotification(title, options);
}

// When user clicks a notification → focus or open the app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList){
        if (client.url.includes(self.location.origin) && 'focus' in client){
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});