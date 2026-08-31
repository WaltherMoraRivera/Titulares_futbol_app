import { create } from "zustand";
import { savePushSubscription, removePushSubscription } from "@/services/supabase-push-service";

type PushSupport = "unsupported" | "supported";
type PushStatus = "default" | "granted" | "denied";

interface PushNotificationsState {
  support: PushSupport;
  status: PushStatus;
  subscribing: boolean;
  checked: boolean;
  /** Lee el permiso actual del navegador y si ya existe una suscripción activa. */
  check: () => void;
  /** Pide permiso (si hace falta) y guarda la suscripción para este equipo. */
  subscribe: (teamId: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export const usePushNotificationsStore = create<PushNotificationsState>((set, get) => ({
  support: "unsupported",
  status: "default",
  subscribing: false,
  checked: false,

  check: () => {
    const supported =
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    set({
      support: supported ? "supported" : "unsupported",
      status: supported ? (Notification.permission as PushStatus) : "default",
      checked: true,
    });
  },

  subscribe: async (teamId) => {
    if (get().support !== "supported") return;
    set({ subscribing: true });
    try {
      const permission = await Notification.requestPermission();
      set({ status: permission as PushStatus });
      if (permission !== "granted") return;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Falta la llave pública de notificaciones.");

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await savePushSubscription(teamId, subscription);
    } finally {
      set({ subscribing: false });
    }
  },

  unsubscribe: async () => {
    if (get().support !== "supported") return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await removePushSubscription(endpoint);
  },
}));
