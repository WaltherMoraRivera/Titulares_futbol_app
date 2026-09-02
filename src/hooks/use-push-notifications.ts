import { create } from "zustand";
import { savePushSubscription, removePushSubscription } from "@/services/supabase-push-service";

type PushSupport = "unsupported" | "supported";
type PushStatus = "default" | "granted" | "denied";

interface PushNotificationsState {
  support: PushSupport;
  status: PushStatus;
  /** Hay una suscripción del navegador confirmada y guardada para este
   * dispositivo. Puede ser false con status "granted" si el permiso se
   * concedió pero el guardado en Supabase falló — en ese caso conviene
   * dejar reintentar en vez de dar el alta por hecha. */
  subscribed: boolean;
  subscribing: boolean;
  checked: boolean;
  /** Lee el permiso actual del navegador y si ya existe una suscripción activa. */
  check: () => Promise<void>;
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
  subscribed: false,
  subscribing: false,
  checked: false,

  check: async () => {
    const supported =
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    if (!supported) {
      set({ support: "unsupported", status: "default", subscribed: false, checked: true });
      return;
    }

    const status = Notification.permission as PushStatus;
    set({ support: "supported", status, checked: true });
    if (status !== "granted") {
      set({ subscribed: false });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      set({ subscribed: !!existing });
    } catch {
      set({ subscribed: false });
    }
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
      set({ subscribed: true });
    } catch (err) {
      set({ subscribed: false });
      throw err;
    } finally {
      set({ subscribing: false });
    }
  },

  unsubscribe: async () => {
    if (get().support !== "supported") return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    set({ subscribed: false });
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await removePushSubscription(endpoint);
  },
}));
