"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players";
import { useMatchesStore } from "@/hooks/use-matches";
import {
  addMatchCard,
  addMatchGoal,
  fetchMatchCards,
  fetchMatchGoals,
  fetchMatchResult,
  removeMatchCard,
  removeMatchGoal,
  saveMatchResult,
} from "@/services/supabase-match-service";
import { getDisplayName } from "@/utils/player-display";
import { CardType, MatchCard, MatchGoal, MatchResult } from "@/types";
import { ArrowLeft, X } from "lucide-react";

const CARD_LABELS: Record<CardType, string> = {
  yellow: "Amarilla",
  red: "Roja",
};

const CARD_STYLES: Record<CardType, string> = {
  yellow: "bg-yellow-500/20 text-yellow-600",
  red: "bg-destructive/15 text-destructive",
};

export default function MatchResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { loaded: authLoaded, teamId, role, load: loadAuth } = useAuthStore();
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();
  const { matches, loaded: matchesLoaded, load: loadMatches } = useMatchesStore();

  const [result, setResult] = useState<MatchResult | null>(null);
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [teamScore, setTeamScore] = useState("0");
  const [opponentScore, setOpponentScore] = useState("0");
  const [notes, setNotes] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  const [goalPlayerId, setGoalPlayerId] = useState("");
  const [goalMinute, setGoalMinute] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);

  const [cardPlayerId, setCardPlayerId] = useState("");
  const [cardType, setCardType] = useState<CardType>("yellow");
  const [cardMinute, setCardMinute] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  const isDt = role === "dt";
  const match = matches.find((m) => m.id === id);

  useEffect(() => {
    if (!authLoaded) loadAuth();
  }, [authLoaded, loadAuth]);

  useEffect(() => {
    if (authLoaded) {
      loadPlayers();
      loadMatches();
    }
  }, [authLoaded, teamId, loadPlayers, loadMatches]);

  useEffect(() => {
    if (!authLoaded || !teamId) return;
    Promise.all([fetchMatchResult(id), fetchMatchGoals(id), fetchMatchCards(id)]).then(
      ([resultData, goalsData, cardsData]) => {
        setResult(resultData);
        setGoals(goalsData);
        setCards(cardsData);
        setTeamScore(String(resultData?.teamScore ?? 0));
        setOpponentScore(String(resultData?.opponentScore ?? 0));
        setNotes(resultData?.notes ?? "");
        setDataLoaded(true);
      }
    );
  }, [authLoaded, teamId, id]);

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const playerItems = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, getDisplayName(p)])),
    [players]
  );

  async function handleSaveResult() {
    if (!teamId) return;
    setSavingResult(true);
    try {
      const updated = await saveMatchResult(
        teamId,
        id,
        Number(teamScore) || 0,
        Number(opponentScore) || 0,
        notes
      );
      setResult(updated);
      toast.success("Resultado guardado");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar el resultado.");
    } finally {
      setSavingResult(false);
    }
  }

  async function handleAddGoal() {
    if (!teamId || !goalPlayerId) return;
    setAddingGoal(true);
    try {
      const minute = goalMinute.trim() ? Number(goalMinute) : undefined;
      const goal = await addMatchGoal(teamId, id, goalPlayerId, minute);
      setGoals((prev) => [...prev, goal]);
      setGoalPlayerId("");
      setGoalMinute("");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo agregar el gol.");
    } finally {
      setAddingGoal(false);
    }
  }

  async function handleRemoveGoal(goalId: string) {
    await removeMatchGoal(goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  async function handleAddCard() {
    if (!teamId || !cardPlayerId) return;
    setAddingCard(true);
    try {
      const minute = cardMinute.trim() ? Number(cardMinute) : undefined;
      const card = await addMatchCard(teamId, id, cardPlayerId, cardType, minute);
      setCards((prev) => [...prev, card]);
      setCardPlayerId("");
      setCardMinute("");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo agregar la tarjeta.");
    } finally {
      setAddingCard(false);
    }
  }

  async function handleRemoveCard(cardId: string) {
    await removeMatchCard(cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  }

  const loading = !authLoaded || !playersLoaded || !matchesLoaded || !dataLoaded;

  if (authLoaded && !teamId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión con el código de tu equipo para ver este resultado.
        </p>
        <Link href="/login">
          <Button>Ingresar con código</Button>
        </Link>
      </div>
    );
  }

  if (!loading && !match) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Partido no encontrado.</p>
        <Link href="/matches">
          <Button variant="outline">Volver a partidos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 pb-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href={`/matches/${id}`}>
          <Button size="icon" variant="ghost" aria-label="Volver al partido">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-semibold">
          {match?.opponent ? `vs ${match.opponent}` : "Resultado"}
        </h1>
      </header>

      {!loading && !isDt && !result && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          El DT todavía no cargó el resultado de este partido.
        </p>
      )}

      {!loading && (isDt || result) && (
        <>
          <section className="mb-6 rounded-xl border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-muted-foreground">Resultado</p>
            {isDt ? (
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <Label htmlFor="teamScore" className="text-xs">
                    Las Condes FC
                  </Label>
                  <Input
                    id="teamScore"
                    type="number"
                    inputMode="numeric"
                    className="w-16 text-center"
                    value={teamScore}
                    onChange={(e) => setTeamScore(e.target.value)}
                  />
                </div>
                <span className="mt-5 text-lg font-bold">—</span>
                <div className="flex flex-col items-center gap-1">
                  <Label htmlFor="opponentScore" className="text-xs">
                    {match?.opponent || "Rival"}
                  </Label>
                  <Input
                    id="opponentScore"
                    type="number"
                    inputMode="numeric"
                    className="w-16 text-center"
                    value={opponentScore}
                    onChange={(e) => setOpponentScore(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <p className="text-center text-2xl font-bold">
                {result?.teamScore} — {result?.opponentScore}
              </p>
            )}

            {isDt && (
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="notes">Notas del DT (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ej: Buen partido colectivo, mejorar la salida desde el fondo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            {!isDt && result?.notes?.trim() && (
              <p className="mt-4 rounded-md border bg-muted/50 p-2 text-sm">{result.notes}</p>
            )}

            {isDt && (
              <Button className="mt-4 w-full" onClick={handleSaveResult} disabled={savingResult}>
                Guardar resultado
              </Button>
            )}
          </section>

          <section className="mb-6">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              Goleadores {goals.length > 0 ? `(${goals.length})` : ""}
            </p>
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin goles registrados.</p>
            )}
            <div className="space-y-2">
              {goals.map((goal) => {
                const player = playersById.get(goal.playerId);
                return (
                  <div
                    key={goal.id}
                    className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
                  >
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {player ? getDisplayName(player) : "Jugador"}
                      {goal.minute !== undefined ? ` · ${goal.minute}'` : ""}
                    </p>
                    {isDt && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Quitar gol"
                        onClick={() => handleRemoveGoal(goal.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {isDt && (
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Jugador</Label>
                  <Select
                    items={playerItems}
                    value={goalPlayerId}
                    onValueChange={(v) => setGoalPlayerId(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Elegir" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {getDisplayName(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-16 space-y-1.5">
                  <Label>Min.</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={goalMinute}
                    onChange={(e) => setGoalMinute(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddGoal} disabled={!goalPlayerId || addingGoal}>
                  Agregar
                </Button>
              </div>
            )}
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              Tarjetas {cards.length > 0 ? `(${cards.length})` : ""}
            </p>
            {cards.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin tarjetas registradas.</p>
            )}
            <div className="space-y-2">
              {cards.map((card) => {
                const player = playersById.get(card.playerId);
                return (
                  <div
                    key={card.id}
                    className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
                  >
                    <span
                      className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${CARD_STYLES[card.cardType]}`}
                    >
                      {CARD_LABELS[card.cardType]}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {player ? getDisplayName(player) : "Jugador"}
                      {card.minute !== undefined ? ` · ${card.minute}'` : ""}
                    </p>
                    {isDt && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Quitar tarjeta"
                        onClick={() => handleRemoveCard(card.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {isDt && (
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Jugador</Label>
                  <Select
                    items={playerItems}
                    value={cardPlayerId}
                    onValueChange={(v) => setCardPlayerId(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Elegir" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {getDisplayName(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    items={CARD_LABELS}
                    value={cardType}
                    onValueChange={(v) => setCardType((v as CardType) ?? "yellow")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yellow">Amarilla</SelectItem>
                      <SelectItem value="red">Roja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-16 space-y-1.5">
                  <Label>Min.</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={cardMinute}
                    onChange={(e) => setCardMinute(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddCard} disabled={!cardPlayerId || addingCard}>
                  Agregar
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
