const CACHE_NAME = 'taskmaster-v1';
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/index.js',
    '/icon.svg',
    '/manifest.json'
];
// URLs that should be cached but are less critical
const PRECACHE_URLS = [
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://unpkg.com/@capacitor/pwa-elements@latest/dist/pwa-elements.js',
];

// On install, cache the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL_URLS.concat(PRECACHE_URLS)))
            .then(() => self.skipWaiting())
    );
});

// On activate, clean up old caches and take control
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// On fetch, use a caching strategy
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For navigation requests, use a network-first strategy to get the latest app shell
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // For other requests, use a cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Not in cache - fetch and cache
                return fetch(event.request).then(
                    (response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
                            return response;
                        }

                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});