"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, SquarePlus } from "lucide-react";

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
        {number}
      </span>
      <p className="pt-0.5 text-sm">{children}</p>
    </li>
  );
}

/** Guía paso a paso para instalar la PWA en iPhone/iPad — Safari nunca
 * ofrece esto automáticamente (a diferencia de Android), así que es la
 * única forma real de "instalar" ahí: agregarla a la pantalla de inicio. */
export function IOSInstallGuide({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Instalar en iPhone</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Safari no ofrece instalar apps de forma automática — son estos 3 pasos, una sola vez.
          </p>

          <ol className="space-y-3">
            <Step number={1}>
              Toca el ícono <Share className="mx-1 inline h-4 w-4 align-text-bottom" /> de{" "}
              <strong>Compartir</strong>, en la barra de Safari.
            </Step>
            <Step number={2}>
              Desliza la lista de opciones hasta encontrar{" "}
              <SquarePlus className="mx-1 inline h-4 w-4 align-text-bottom" />{" "}
              <strong>&quot;Agregar a inicio&quot;</strong> y tócala.
            </Step>
            <Step number={3}>
              Toca <strong>&quot;Agregar&quot;</strong> arriba a la derecha. Queda un ícono en tu
              pantalla de inicio, como cualquier app.
            </Step>
          </ol>

          <p className="text-xs text-muted-foreground">
            ¿No ves el ícono de Compartir? Asegúrate de estar en Safari — otros navegadores en
            iPhone no siempre lo permiten.
          </p>
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
