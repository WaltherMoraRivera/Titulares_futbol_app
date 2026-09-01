"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushNotificationsStore } from "@/hooks/use-push-notifications";
import { Bell } from "lucide-react";

const DISMISS_KEY = "titulares:push-opt-in-dismissed";

/** Banner para activar notificaciones push de partidos nuevos. Se muestra
 * si el navegador las soporta y todavía no hay una suscripción confirmada
 * (permiso sin decidir, o concedido pero sin guardarse bien la última vez),
 * salvo que el usuario lo haya descartado antes en este dispositivo. */
export function NotificationOptIn({ teamId }: { teamId: string }) {
  const { support, status, subscribed, subscribing, checked, check, subscribe } =
    usePushNotificationsStore();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    check();
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, [check]);

  if (!checked || support !== "supported" || status === "denied" || dismissed) return null;
  if (subscribed) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function handleActivate() {
    try {
      await subscribe(teamId);
      toast.success("Notificaciones activadas.");
      dismiss();
    } catch (err) {
      console.error("No se pudo activar la notificación push:", err);
      const message = err instanceof Error ? err.message : "No se pudieron activar.";
      toast.error(`No se pudieron activar las notificaciones: ${message}`);
    }
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
      <Bell className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-muted-foreground">
        {status === "granted"
          ? "El permiso está concedido pero falta confirmar la suscripción. Vuelve a intentarlo."
          : "Activa las notificaciones para enterarte apenas se agende un partido nuevo."}
      </p>
      <Button size="sm" variant="outline" onClick={handleActivate} disabled={subscribing}>
        {status === "granted" ? "Reintentar" : "Activar"}
      </Button>
      <Button size="sm" variant="ghost" onClick={dismiss}>
        Ahora no
      </Button>
    </div>
  );
}
