"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore, TeamRole } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players";
import { supabase } from "@/lib/supabase/client";
import { getPositionColor } from "@/utils/position-colors";
import { PlayerForm } from "@/features/players/player-form";
import { Position, PlayerInput } from "@/types";
import { ArrowLeft, UserPlus } from "lucide-react";

interface TeamPlayer {
  id: string;
  number: number;
  name: string;
  alias: string | null;
  show_alias: boolean;
  primary_position: string;
  claimed_by: string | null;
}

type Step = "code" | "pick-player" | "done";

export default function LoginPage() {
  const router = useRouter();
  const { teamId, teamName, role, actualRole, playerId, loginWithCode, claimPlayer } =
    useAuthStore();

  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const { addPlayer } = usePlayersStore();

  useEffect(() => {
    if (teamId && role === "dt") setStep("done");
    else if (teamId && playerId) setStep("done");
  }, [teamId, role, playerId]);

  async function handleSubmitCode() {
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const resolvedRole: TeamRole = await loginWithCode(code);
      if (resolvedRole === "dt" || resolvedRole === "admin") {
        setStep("done");
        return;
      }
      setLoadingPlayers(true);
      const { data, error: fetchError } = await supabase
        .from("players")
        .select("id, number, name, alias, show_alias, primary_position, claimed_by")
        .order("number");
      if (fetchError) throw fetchError;
      setPlayers(data ?? []);
      setStep("pick-player");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar el código.");
    } finally {
      setSubmitting(false);
      setLoadingPlayers(false);
    }
  }

  async function handleClaim(player: TeamPlayer) {
    setSubmitting(true);
    setError(null);
    try {
      await claimPlayer(player.id);
      setStep("done");
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
      setStep("done");
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" aria-label="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Ingresar con código de equipo</h1>
      </div>

      {step === "code" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pídele al capitán o al DT el código de tu equipo. Si eres el DT o
            capitán, usa tu propio código de administración.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="code">Código de equipo</Label>
            <Input
              id="code"
              autoCapitalize="characters"
              placeholder="Ej: CONDESFC-JUGADOR"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitCode()}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" size="lg" onClick={handleSubmitCode} disabled={submitting}>
            {submitting ? "Verificando..." : "Ingresar"}
          </Button>
        </motion.div>
      )}

      {step === "pick-player" && (
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
        </motion.div>
      )}

      {step === "done" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Listo. Entraste a <span className="font-medium text-foreground">{teamName}</span>{" "}
            {actualRole === "admin"
              ? `como administrador (vista: ${role === "dt" ? "DT/Capitán" : "Jugador"}).`
              : role === "dt"
                ? "como DT/Capitán."
                : "como jugador."}
          </p>
          <Button className="w-full" size="lg" onClick={() => router.push("/")}>
            Ir al inicio
          </Button>
        </motion.div>
      )}

      <PlayerForm
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        existingNumbers={players.map((p) => p.number)}
        restrictedMode
        selfRegister
        onSubmit={handleSelfRegister}
      />
    </div>
  );
}
