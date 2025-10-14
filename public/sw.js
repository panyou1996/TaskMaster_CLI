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
const IS_DEV = (self.location && (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'));

self.addEventListener('install', (event) => {
    // In development, avoid precaching to prevent stale local files being served.
    if (IS_DEV) {
        console.info('SW (dev): skipping precache during install');
        event.waitUntil(self.skipWaiting());
        return;
    }

    event.waitUntil((async () => {
        try {
            const cache = await caches.open(CACHE_NAME);
            const urlsToCache = APP_SHELL_URLS.concat(PRECACHE_URLS);
            // Cache each URL individually so a single failing external resource won't abort install
            for (const url of urlsToCache) {
                try {
                    const response = await fetch(url, { cache: 'no-cache', mode: 'cors' });
                    if (response && response.ok) {
                        await cache.put(url, response.clone());
                    } else {
                        // Skip caching if response not ok
                        console.warn('SW: skipping cache for', url, 'status:', response && response.status);
                    }
                } catch (e) {
                    // Network or CORS error - skip that URL but continue install
                    console.warn('SW: failed to fetch/cached url, skipping', url, e);
                }
            }
        } catch (e) {
            console.error('SW install error (non-fatal):', e);
        }
        await self.skipWaiting();
    })());
});

// On activate, clean up old caches and take control
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        if (!IS_DEV) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((cacheName) => {
                if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
                return Promise.resolve();
            }));
        }
        await self.clients.claim();
    })());
});

// On fetch, use a caching strategy
self.addEventListener('fetch', (event) => {
    // In development, prefer network for everything to avoid serving stale cached files
    if (IS_DEV) {
        if (event.request.method !== 'GET') return;
        event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
        return;
    }

    // Production behavior: only intercept GET requests
    if (event.request.method !== 'GET') return;

    // Don't cache API calls or dynamic endpoints (Supabase, functions, auth, etc.)
    try {
        const requestUrl = new URL(event.request.url);
        const IGNORED_API_HOSTS = ['supabase.co'];
        const IGNORED_API_PATH_PREFIXES = ['/rest/v1', '/functions/v1', '/auth/v1', '/storage/v1', '/api/'];

        // If host matches known API hosts, use network-only
        if (IGNORED_API_HOSTS.some(h => requestUrl.host.includes(h))) {
            event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
            return;
        }

        // If the path begins with any API prefix, use network-only
        if (IGNORED_API_PATH_PREFIXES.some(p => requestUrl.pathname.startsWith(p))) {
            event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
            return;
        }
    } catch (e) {
        // If URL parsing fails, fall back to simple include checks
        const requestUrlStr = event.request.url || '';
        if (requestUrlStr.includes('supabase.co') || requestUrlStr.includes('/api/')) {
            event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
            return;
        }
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
    const notification = event.notification;
    const action = event.action;

    // Always close the notification that was clicked
    notification.close();

    // Helper to schedule a follow-up notification from the SW
    const scheduleFromSW = (delayMs, titleOverride) => {
        const title = titleOverride || (notification.title.includes('(Snoozed)') ? notification.title : `${notification.title} (Snoozed)`);
        setTimeout(() => {
            self.registration.showNotification(title, {
                body: notification.body,
                icon: notification.icon,
                tag: notification.tag,
                actions: notification.actions,
                data: notification.data
            }).catch(err => console.warn('SW: showNotification failed in snooze', err));
        }, delayMs);
    };

    if (action === 'snooze_5' || action === 'snooze_15') {
        const minutes = action === 'snooze_5' ? 5 : 15;
        scheduleFromSW(minutes * 60 * 1000);
        return;
    }

    if (action === 'close') {
        // nothing to do
        return;
    }

    if (action === 'complete') {
        // Notify all clients that the task was completed from the notification action
        const taskId = notification.data && notification.data.taskId ? notification.data.taskId : undefined;
        self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
            for (const client of clients) {
                client.postMessage({ type: 'NOTIFICATION_ACTION', action: 'complete', taskId });
            }
        });
        return;
    }

    // Default action (notification body clicked): open/focus the task URL if provided
    event.waitUntil(
        (async () => {
            const url = notification.data && notification.data.url ? notification.data.url : '/';
            const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
            if (clientList.length > 0) {
                // Try to focus an existing client, and navigate it if possible
                for (const client of clientList) {
                    try {
                        await client.focus();
                        // Attempt to navigate if the client supports postMessage open
                        client.postMessage({ type: 'NAVIGATE_TO', url });
                        return;
                    } catch (e) {
                        // ignore
                    }
                }
            }
            // No client to focus, open a new window/tab
            await clients.openWindow(url);
        })()
    );
});

// Handle messages from the client to schedule notifications
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, delay, options } = event.data;
        
        const showNotification = () => {
            return self.registration.showNotification(title, options).catch(err => {
                console.error(`Error showing notification: ${err}`);
            });
        };

        const promise = new Promise(resolve => {
            setTimeout(() => {
                showNotification().then(resolve);
            }, delay || 0);
        });

        event.waitUntil(promise);
    }
});