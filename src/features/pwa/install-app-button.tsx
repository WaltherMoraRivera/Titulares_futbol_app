"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInstallPromptStore } from "@/hooks/use-install-prompt";
import { IOSInstallGuide } from "@/features/pwa/ios-install-guide";
import { Download, RefreshCw } from "lucide-react";

const APK_URL =
  "https://raw.githubusercontent.com/WaltherMoraRivera/Titulares_futbol_app/main/apk/Titulares_Android.apk";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

/** Botón manual para instalar (o, si ya está instalada, forzar una
 * actualización) la app — cubre el caso de alguien que se perdió el aviso
 * automático del navegador la primera vez, que solo aparece una vez. */
export function InstallAppButton() {
  const { deferredEvent, installed, setDeferredEvent } = useInstallPromptStore();
  const [busy, setBusy] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  async function handleInstall() {
    if (deferredEvent) {
      setBusy(true);
      try {
        await deferredEvent.prompt();
        const choice = await deferredEvent.userChoice;
        if (choice.outcome === "accepted") setDeferredEvent(null);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isIOS()) {
      setIosGuideOpen(true);
      return;
    }

    // Sin beforeinstallprompt disponible (ya se descartó antes, o el
    // navegador no lo soporta): ofrecer el .apk como alternativa manual.
    window.open(APK_URL, "_blank");
  }

  async function handleUpdate() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
      toast.success("Buscando actualizaciones. Si hay una nueva versión, se aplica al recargar.");
      window.location.reload();
    } catch {
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {installed ? (
        <Button
          className="w-full justify-start"
          size="lg"
          variant="outline"
          onClick={handleUpdate}
          disabled={busy}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Buscar actualizaciones
        </Button>
      ) : (
        <Button
          className="w-full justify-start"
          size="lg"
          variant="outline"
          onClick={handleInstall}
          disabled={busy}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Instalar app
        </Button>
      )}
      <IOSInstallGuide open={iosGuideOpen} onOpenChange={setIosGuideOpen} />
    </>
  );
}
