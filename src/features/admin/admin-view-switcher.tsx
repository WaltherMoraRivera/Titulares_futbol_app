"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export function AdminViewSwitcher() {
  const { loaded, actualRole, role, load, setPreviewRole } = useAuthStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  if (actualRole !== "admin") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
      <div className="flex items-center gap-2 rounded-full border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Vista:</span>
        <div className="flex overflow-hidden rounded-full border">
          <button
            type="button"
            onClick={() => setPreviewRole("player")}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-colors",
              role === "player" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            Jugador
          </button>
          <button
            type="button"
            onClick={() => setPreviewRole("dt")}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-colors",
              role === "dt" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            DT/Capitán
          </button>
        </div>
      </div>
    </div>
  );
}
