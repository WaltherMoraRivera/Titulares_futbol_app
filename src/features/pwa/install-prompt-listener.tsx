"use client";

import { useEffect } from "react";
import { useInstallPromptStore, BeforeInstallPromptEvent } from "@/hooks/use-install-prompt";

/** Captura el evento `beforeinstallprompt` apenas el navegador lo emite y
 * lo guarda para poder disparar la instalación después, desde un botón
 * propio ("Instalar app" en el inicio) en vez de depender del aviso
 * automático del navegador — que solo aparece una vez y, si se ignora o
 * descarta, no vuelve a ser fácil de encontrar. */
export function InstallPromptListener() {
  const setDeferredEvent = useInstallPromptStore((s) => s.setDeferredEvent);
  const setInstalled = useInstallPromptStore((s) => s.setInstalled);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [setDeferredEvent, setInstalled]);

  return null;
}
