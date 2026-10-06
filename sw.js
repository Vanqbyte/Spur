// Spur Service Worker — notifications with follow-ups + offline caching

const CACHE = 'spur-v10-1';
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
let pendingReminders = [];
let scheduledTimers = new Map(); // id → setTimeout handle

// Follow-up intervals: 1 hour and 4 hours
const FOLLOWUP_1_MS = 60 * 60 * 1000;       // +1 hr
const FOLLOWUP_2_MS = 4 * 60 * 60 * 1000;   // +4 hrs

self.addEventListener('message', (e) => {
  const data = e.data || {};

  if (data.type === 'SCHEDULE_REMINDERS'){
    pendingReminders = data.reminders || [];
    rescheduleAll();
  }

  if (data.type === 'CANCEL_REMINDER'){
    const id = data.id;
    clearTimersFor(id);
    pendingReminders = pendingReminders.filter(r => r.id !== id);
  }

  if (data.type === 'SKIP_WAITING'){
    self.skip,Waiting();
  }
});

function clearTimersFor(id){
  // Cancel all timers scheduled for this reminder id
  for (const [key, handle] of scheduledTimers.entries()){
    if (key.startsWith(id + '::')){
      clearTimeout(handle);
      scheduledTimers.delete(key);
    }
  }
}

function clearAllTimers(){
  for (const handle of scheduledTimers.values()) clearTimeout(handle);
  scheduledTimers.clear();
}

function scheduleTimer(key, when callback){
  const delay = Math.max(0, when - Date.now());
  // Don't schedule things more than 24h out — they may drift on mobile
  if (delay > 24 * 60 * 60 * 1000) return;
  const handle = setTimeout(callback, delay);
  scheduledTimers.set(key, handle);
}

function rescheduleAll(){
  clearAllTimers();
  const now = Date.now();

  pendingReminders.forEach(r => {
    if (r.done) return;
    if (!r.nextFireAt) return;

    // Primary fire
    if (r.nextFireAt > now){
      scheduleTimer(r.id + '::main', r.nextFireAt, () => fireMain(r));
    }

    // Follow-ups (Once reminders only)
    if (r.repeat === 'Once'){
      const follow1 = r.nextFireAt + FOLLOWUP_1_MS;
      const follow2 = r.nextFireAt + FOLLOWUP_2_MS;

      if (follow1 > now){
        scheduleTimer(r.id + '::f1', follow1, () => fireFollowup(r, '1h later'));
      }
      if (follow2 > now){
        scheduleTimer(r.id + '::f2', follow2, () => fireFollowup(r, '4h later'));
      }
    }
  });
}

function fireMain(r){
  showNotif(r, r.title, null);
  scheduledTimers.delete(r.id + '::main');
}

function fireFollowup(r, suffix){
  // Only fire if the reminder is still in our pending list AND not done
  const still = pendingReminders.find(x => x.id === r.id);
  if (!still || still.done){
    scheduledTimers.delete(r.id + '::' + (suffix.includes('1h') ? 'f1' : 'f2'));
    return;
  }
  showNotif(r, r.title, suffix);
  scheduledTimers.delete(r.id + '::' + (suffix.includes('1h') ? 'f1' : 'f2'));
}

function showNotif(r, body, followupSuffix){
  // Title = context label (Reminder / Body / Craft / People)
  const context = r.pillar || 'Reminder';

  // Body combines title + optional follow-up note
  let fullBody = body;
  if (followupSuffix){
    fullBody = `${body} · ${followupSuffix}`;
  }

  const options = {
    body: fullBody,
    tag: 'spur-' + r.id + (followupSuffix ? '-' + followupSuffix : ''),
    renotify: true,
    requireInteraction: false,
    data: { url: './', id: r.id }
  };

  self.registration.showNotification(context, options);
}

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