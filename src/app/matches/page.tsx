"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMatchesStore } from "@/hooks/use-matches";
import { useAuthStore } from "@/hooks/use-auth";
import { MatchForm } from "@/features/matches/match-form";
import { NotificationSettings } from "@/features/matches/notification-settings";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Match, MatchResult } from "@/types";
import { ArrowLeft, Plus, KeyRound, CalendarDays, BellRing } from "lucide-react";

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

export default function MatchesPage() {
  const { matches, results, loaded, load, addMatch } = useMatchesStore();
  const { loaded: authLoaded, teamId, teamName, role, load: loadAuth } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  async function notifyMatch(matchId: string) {
    setNotifyingId(matchId);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sin sesión.");

      const res = await fetch("/api/notify-match", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "No se pudo notificar.");

      if (result.sent === 0 && result.failed === 0) {
        toast.info("Nadie con la asistencia pendiente tiene notificaciones activas.");
      } else {
        toast.success(`Notificación enviada a ${result.sent} jugador(es) sin confirmar.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo notificar.");
    } finally {
      setNotifyingId(null);
    }
  }

  useEffect(() => {
    if (!authLoaded) loadAuth();
  }, [authLoaded, loadAuth]);

  useEffect(() => {
    if (authLoaded) load();
  }, [authLoaded, teamId, load]);

  const isDt = role === "dt";
  const todayStr = new Date().toISOString().slice(0, 10);

  const { upcoming, past } = useMemo(() => {
    const upcoming: Match[] = [];
    const past: Match[] = [];
    for (const m of matches) {
      (m.date >= todayStr ? upcoming : past).push(m);
    }
    past.reverse();
    return { upcoming, past };
  }, [matches, todayStr]);

  const resultsByMatchId = useMemo(
    () => new Map(results.map((r) => [r.matchId, r])),
    [results]
  );

  if (authLoaded && !teamId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión con el código de tu equipo para ver los partidos.
        </p>
        <Link href="/login">
          <Button>
            <KeyRound className="mr-1 h-4 w-4" />
            Ingresar con código
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" aria-label="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-semibold">Partidos</h1>
        {isDt && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Agendar
          </Button>
        )}
      </header>

      {teamId && <NotificationSettings teamId={teamId} />}

      {loaded && matches.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {isDt
            ? "Todavía no agendaste ningún partido."
            : "Todavía no hay partidos agendados por el DT/capitán."}
        </p>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Próximos</p>
          <AnimatePresence initial={false}>
            {upcoming.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                isDt={isDt}
                notifying={notifyingId === match.id}
                onNotify={() => notifyMatch(match.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Pasados</p>
          <AnimatePresence initial={false}>
            {past.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                result={resultsByMatchId.get(match.id)}
                teamName={teamName}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <MatchForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (input) => {
          await addMatch(input);
        }}
      />
    </div>
  );
}

function MatchRow({
  match,
  isDt,
  notifying,
  onNotify,
  result,
  teamName,
}: {
  match: Match;
  isDt?: boolean;
  notifying?: boolean;
  onNotify?: () => void;
  result?: MatchResult;
  teamName?: string | null;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-2"
    >
      <Link
        href={`/matches/${match.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium capitalize">
            {formatDate(match.date)}
            {match.kickoffTime ? ` · ${match.kickoffTime}` : ""}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {match.opponent ? `vs ${match.opponent}` : "Rival por definir"}
            {match.location ? ` · ${match.location}` : ""}
          </p>
          {result && (
            <ScoreLine
              teamName={teamName}
              opponent={match.opponent}
              teamScore={result.teamScore}
              opponentScore={result.opponentScore}
            />
          )}
        </div>
      </Link>
      {isDt && (
        <Button
          size="icon"
          variant="outline"
          aria-label="Notificar partido a los jugadores"
          disabled={notifying}
          onClick={onNotify}
        >
          <BellRing className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}

function ScoreLine({
  teamName,
  opponent,
  teamScore,
  opponentScore,
}: {
  teamName?: string | null;
  opponent?: string;
  teamScore: number;
  opponentScore: number;
}) {
  const outcome =
    teamScore > opponentScore ? "win" : teamScore < opponentScore ? "loss" : "draw";

  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-sm">
      <span className="min-w-0 truncate font-medium uppercase">{teamName ?? "Nuestro equipo"}</span>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-bold",
          outcome === "win" && "bg-emerald-500/15 text-emerald-500",
          outcome === "loss" && "bg-destructive/15 text-destructive",
          outcome === "draw" && "bg-muted text-muted-foreground"
        )}
      >
        {teamScore} - {opponentScore}
      </span>
      <span className="min-w-0 truncate font-medium uppercase">{opponent ?? "Rival"}</span>
    </p>
  );
}
