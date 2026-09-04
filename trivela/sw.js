const CACHE_NAME = 'shopcoin-supplier-v1';
const ASSETS = [
  '/supplier.html',
  '/supplier.js',
  '/logo-official.png'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network-First Fallback to Cache)
self.addEventListener('fetch', event => {
  // Only intercept HTTP GET requests to local origin
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful requests dynamically
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push Event: Receive push notification from the server
self.addEventListener('push', event => {
  let data = { 
    title: 'شوب كوينز الموردين', 
    body: 'لديك إشعار جديد بانتظار المراجعة!', 
    url: '/supplier.html' 
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { 
        title: 'شوب كوينز الموردين', 
        body: event.data.text(), 
        url: '/supplier.html' 
      };
    }
  }
  
  const options = {
    body: data.body,
    icon: '/logo-official.png',
    badge: '/logo-official.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/supplier.html'
    },
    actions: [
      { action: 'open', title: 'عرض الطلبات 📂' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event: Open application when notification is clicked
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const targetUrl = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If a window is already open at the supplier page, focus it and redirect
      for (let client of windowClients) {
        if (client.url.includes('/supplier.html') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
