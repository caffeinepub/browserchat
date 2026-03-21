// Legacy fallback service worker - FCM is handled by firebase-messaging-sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
