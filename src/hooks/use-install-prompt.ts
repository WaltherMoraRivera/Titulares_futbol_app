import { create } from "zustand";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptState {
  /** Evento capturado del navegador, listo para disparar con .prompt().
   * Null si el navegador todavía no lo emitió (o no lo soporta). */
  deferredEvent: BeforeInstallPromptEvent | null;
  /** La PWA ya corre en modo standalone (instalada). */
  installed: boolean;
  setDeferredEvent: (event: BeforeInstallPromptEvent | null) => void;
  setInstalled: (installed: boolean) => void;
}

export const useInstallPromptStore = create<InstallPromptState>((set) => ({
  deferredEvent: null,
  installed: false,
  setDeferredEvent: (deferredEvent) => set({ deferredEvent }),
  setInstalled: (installed) => set({ installed }),
}));
