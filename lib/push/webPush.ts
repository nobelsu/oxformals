"use client";

/**
 * Browser push: register the service worker, subscribe with our VAPID key, and
 * save the subscription. Only prompts when asked to (the "Turn on alerts?"
 * card); otherwise just keeps an already-allowed browser's subscription saved.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type SavedSubscription = { endpoint: string; p256dh: string; auth: string };

/** False on iPhone Safari outside a home-screen app, and without a key. */
export function webPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    VAPID_PUBLIC_KEY !== ""
  );
}

function applicationServerKey(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

export async function ensureWebPushSubscription(
  save: (sub: SavedSubscription) => Promise<unknown>,
  { prompt }: { prompt: boolean },
): Promise<NotificationPermission | "unsupported"> {
  if (!webPushSupported()) return "unsupported";
  let permission = Notification.permission;
  if (permission === "default" && prompt) {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return permission;

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(VAPID_PUBLIC_KEY),
    }));
  const json = subscription.toJSON();
  if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
    await save({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
  }
  return "granted";
}
