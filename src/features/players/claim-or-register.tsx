"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players";
import { PlayerForm } from "@/features/players/player-form";
import { getPositionColor } from "@/utils/position-colors";
import { Position, PlayerInput } from "@/types";
import { UserPlus } from "lucide-react";

interface TeamPlayer {
  id: string;
  number: number;
  name: string;
  alias: string | null;
  show_alias: boolean;
  primary_position: string;
  claimed_by: string | null;
}

/** Lista de la plantilla para reclamar un número existente, más la opción
 * de registrarse como jugador nuevo si no está en la lista. Usado tanto en
 * el flujo de /login (recién ingresado con el código) como en /profile
 * (alguien que ya tiene sesión pero todavía no reclamó ningún jugador). */
export function ClaimOrRegisterPlayer({
  teamName,
  onDone,
}: {
  teamName: string | null;
  onDone: () => void;
}) {
  const { claimPlayer } = useAuthStore();
  const { addPlayer } = usePlayersStore();

  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select("id, number, name, alias, show_alias, primary_position, claimed_by")
        .order("number");
      if (cancelled) return;
      if (!fetchError) setPlayers(data ?? []);
      setLoadingPlayers(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClaim(player: TeamPlayer) {
    setSubmitting(true);
    setError(null);
    try {
      await claimPlayer(player.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reclamar el jugador.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelfRegister(input: PlayerInput) {
    setSubmitting(true);
    setError(null);
    try {
      const created = await addPlayer(input);
      await claimPlayer(created.id);
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo completar el registro.";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Elige tu número de camiseta en la plantilla de{" "}
        <span className="font-medium text-foreground">{teamName}</span>.
      </p>
      {loadingPlayers && <p className="text-sm text-muted-foreground">Cargando plantilla...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="max-h-[60vh] space-y-2 overflow-y-auto">
        {players.map((p) => {
          const color = getPositionColor(p.primary_position as Position) ?? "#888";
          const displayName = p.show_alias && p.alias?.trim() ? p.alias : p.name;
          return (
            <button
              key={p.id}
              disabled={submitting}
              onClick={() => handleClaim(p)}
              className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary disabled:opacity-50"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {p.number}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{displayName}</span>
              {p.claimed_by && (
                <span className="shrink-0 text-xs text-muted-foreground">Ya reclamado</span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setRegisterOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <UserPlus className="h-4 w-4" />
        No estoy en la lista — registrarme como jugador nuevo
      </button>

      <PlayerForm
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        existingNumbers={players.map((p) => p.number)}
        restrictedMode
        selfRegister
        onSubmit={handleSelfRegister}
      />
    </motion.div>
  );
}
