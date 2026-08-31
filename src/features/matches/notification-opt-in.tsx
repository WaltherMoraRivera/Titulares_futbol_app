"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushNotificationsStore } from "@/hooks/use-push-notifications";
import { Bell } from "lucide-react";

const DISMISS_KEY = "titulares:push-opt-in-dismissed";

/** Banner para activar notificaciones push de partidos nuevos. Se muestra
 * solo si el navegador las soporta, el permiso todavía no fue decidido, y
 * el usuario no lo descartó antes en este dispositivo. */
export function NotificationOptIn({ teamId }: { teamId: string }) {
  const { support, status, subscribing, checked, check, subscribe } = usePushNotificationsStore();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    check();
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, [check]);

  if (!checked || support !== "supported" || status !== "default" || dismissed) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function handleActivate() {
    try {
      await subscribe(teamId);
      if (Notification.permission === "granted") {
        toast.success("Notificaciones activadas.");
        dismiss();
      } else {
        toast.info("No se activaron las notificaciones.");
      }
    } catch {
      toast.error("No se pudieron activar las notificaciones.");
    }
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
      <Bell className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-muted-foreground">
        Activa las notificaciones para enterarte apenas se agende un partido nuevo.
      </p>
      <Button size="sm" variant="outline" onClick={handleActivate} disabled={subscribing}>
        Activar
      </Button>
      <Button size="sm" variant="ghost" onClick={dismiss}>
        Ahora no
      </Button>
    </div>
  );
}
