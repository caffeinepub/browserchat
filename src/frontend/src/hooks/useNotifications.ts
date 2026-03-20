import { useEffect, useRef } from "react";

export function useNotifications() {
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        swRef.current = reg;
      })
      .catch(() => {});

    // Request permission
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const notifyNewMessage = () => {
    if (Notification.permission !== "granted") return;
    if (!swRef.current?.active) {
      // Fallback to direct Notification API
      new Notification("BrowserChat", {
        body: "You have a new message",
        icon: "/favicon.ico",
        tag: "new-message",
      });
      return;
    }
    swRef.current.active.postMessage({ type: "NEW_MESSAGE" });
  };

  return { notifyNewMessage };
}
