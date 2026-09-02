"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushNotificationsStore } from "@/hooks/use-push-notifications";
import { cn } from "@/lib/utils";
import { Bell, BellOff, BellRing } from "lucide-react";

/** Control persistente del estado de las notificaciones push (no un banner
 * descartable): siempre muestra si están activadas o desactivadas en este
 * dispositivo, y deja prenderlas/apagarlas — por ejemplo, un jugador
 * lesionado o suspendido puede apagarlas un tiempo sin perder la
 * suscripción de otro dispositivo ni afectar al resto del equipo. */
export function NotificationSettings({ teamId }: { teamId: string }) {
  const { support, status, subscribed, subscribing, checked, check, subscribe, unsubscribe } =
    usePushNotificationsStore();

  useEffect(() => {
    check();
  }, [check]);

  if (!checked || support !== "supported") return null;

  async function handleToggle() {
    if (subscribed) {
      try {
        await unsubscribe();
        toast.info("Notificaciones desactivadas en este dispositivo.");
      } catch (err) {
        console.error("No se pudo desactivar la notificación push:", err);
        toast.error("No se pudieron desactivar las notificaciones.");
      }
      return;
    }
    try {
      await subscribe(teamId);
      toast.success("Notificaciones activadas.");
    } catch (err) {
      console.error("No se pudo activar la notificación push:", err);
      const message = err instanceof Error ? err.message : "No se pudieron activar.";
      toast.error(`No se pudieron activar las notificaciones: ${message}`);
    }
  }

  if (status === "denied") {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
        <BellOff className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="flex-1 text-muted-foreground">
          Notificaciones bloqueadas para este sitio. Para activarlas, habilítalas en los permisos
          del navegador (junto a la dirección web) y recarga la página.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
      {subscribed ? (
        <BellRing className="h-4 w-4 shrink-0 text-primary" />
      ) : (
        <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <p className="flex-1">
        Notificaciones:{" "}
        <span className={cn("font-medium", subscribed ? "text-primary" : "text-muted-foreground")}>
          {subscribed ? "Activadas" : "Desactivadas"}
        </span>
        <span className="block text-xs text-muted-foreground">
          {subscribed
            ? "Te avisamos en este dispositivo cuando se agende un partido nuevo."
            : "Actívalas para enterarte apenas se agende un partido nuevo."}
        </span>
      </p>
      <Button size="sm" variant="outline" onClick={handleToggle} disabled={subscribing}>
        {subscribed ? "Desactivar" : "Activar"}
      </Button>
    </div>
  );
}
