import { useCallback, useEffect, useRef } from "react";
import { useActor } from "./useActor";

const firebaseConfig = {
  apiKey: "AIzaSyAn6onB6xH8Ql2aWncK4VBsvgp4LWjeOtM",
  authDomain: "secret-chat-app-7d2c9.firebaseapp.com",
  projectId: "secret-chat-app-7d2c9",
  storageBucket: "secret-chat-app-7d2c9.firebasestorage.app",
  messagingSenderId: "400161017179",
  appId: "1:400161017179:web:1707b1634a77c205d89e7e",
  measurementId: "G-P5LSV9KVBV",
};

const VAPID_KEY =
  "BAHdjqD6GaeCoB_7jVCrNMpUpq0VM7p26Bv_oMXCpbt8NN-xcyY8yyeiXuw_rq9pqckNaqOXcLTaJq45_iLoYAo";

let isChatActiveGlobal = false;
export function setChatActiveGlobal(val: boolean) {
  isChatActiveGlobal = val;
}

function showNotification() {
  if (Notification.permission !== "granted") return;
  navigator.serviceWorker.ready
    .then((reg) => {
      reg.showNotification("BrowserChat", {
        body: "You have a new message",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "new-message",
        renotify: true,
      } as NotificationOptions);
    })
    .catch(() => {
      try {
        new Notification("BrowserChat", {
          body: "You have a new message",
          icon: "/favicon.ico",
          tag: "new-message",
        });
      } catch {
        // ignore
      }
    });
}

const dynImport = new Function("url", "return import(url)");

async function loadFirebase() {
  const [appMod, msgMod] = await Promise.all([
    dynImport("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"),
    dynImport(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js",
    ),
  ]);
  return { ...appMod, ...msgMod };
}

export function useNotifications() {
  const { actor } = useActor();
  const tokenSavedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    const setupFCM = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const firebase = await loadFirebase();
        const { getApps, initializeApp, getMessaging, getToken, onMessage } =
          firebase;

        const app =
          getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const messaging = getMessaging(app);

        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
        );

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token && actor && !tokenSavedRef.current) {
          tokenSavedRef.current = true;
          try {
            await (actor as any).saveFcmToken(token);
          } catch {
            // ignore
          }
        }

        onMessage(messaging, (_payload: any) => {
          if (!isChatActiveGlobal) {
            showNotification();
          }
        });
      } catch {
        if (Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      }
    };

    setupFCM();
  }, [actor]);

  const notifyNewMessage = useCallback((isChatActive: boolean) => {
    if (isChatActive) return;
    if (Notification.permission !== "granted") return;
    showNotification();
  }, []);

  return { notifyNewMessage };
}
