importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAn6onB6xH8Ql2aWncK4VBsvgp4LWjeOtM",
  authDomain: "secret-chat-app-7d2c9.firebaseapp.com",
  projectId: "secret-chat-app-7d2c9",
  storageBucket: "secret-chat-app-7d2c9.firebasestorage.app",
  messagingSenderId: "400161017179",
  appId: "1:400161017179:web:1707b1634a77c205d89e7e",
  measurementId: "G-P5LSV9KVBV"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = 'BrowserChat';
  const notificationOptions = {
    body: 'You have a new message',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'new-message',
    renotify: true,
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click - open or focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
