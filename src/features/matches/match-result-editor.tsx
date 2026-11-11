"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveFlexibleMatchResult } from "@/services/supabase-match-service";
import { resizeGoals, type GoalDraft } from "@/utils/match-result-draft";
import { getDisplayName } from "@/utils/player-display";
import type { EventSide, MatchEvent, MatchResult, Player } from "@/types";

interface MatchResultEditorProps {
  matchId: string;
  teamName: string;
  opponent: string;
  events: MatchEvent[];
  result: MatchResult | null;
  notes: string;
  players: Player[];
  onSaved: (result: MatchResult) => void;
  onCancel: () => void;
}

export function MatchResultEditor(props: MatchResultEditorProps) {
  const [snapshot] = useState(() => ({
    events: props.events,
    resultUpdatedAt: props.result?.updatedAt ?? null,
  }));
  const [goals, setGoals] = useState<GoalDraft[]>(() => snapshot.events
    .filter((event) => event.type === "goal")
    .map((event) => ({ id: event.id, side: event.side, player: event.player ?? null })));
  const [scores, setScores] = useState(() => ({
    own: String(goals.filter((goal) => goal.side === "own").length),
    rival: String(goals.filter((goal) => goal.side === "rival").length),
  }));
  const [notes, setNotes] = useState(props.notes);
  const [saving, setSaving] = useState(false);
  const validScores = [scores.own, scores.rival].every((value) =>
    value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 99);
  const own = validScores ? resizeGoals(goals, "own", Number(scores.own)) : { goals, remainingRemovals: 0 };
  const rival = validScores ? resizeGoals(own.goals, "rival", Number(scores.rival)) : { goals, remainingRemovals: 0 };
  const draft = rival.goals;
  const removed = snapshot.events.filter((event) => event.type === "goal" && !draft.some((goal) => goal.id === event.id));
  const playerItems: Record<string, string> = {
    __none__: "Sin asignar",
    ...Object.fromEntries(props.players.map((player) => [player.id, `#${player.number} ${getDisplayName(player)}`])),
  };

  function goalLabel(goal: GoalDraft) {
    if (goal.player?.playerId) {
      const player = props.players.find((player) => player.id === goal.player?.playerId);
      return player ? getDisplayName(player) : "Jugador no disponible";
    }
    return [goal.player?.number != null ? `#${goal.player.number}` : "", goal.player?.name].filter(Boolean).join(" ") || "Sin asignar";
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!validScores || own.remainingRemovals || rival.remainingRemovals || saving) return;
    setSaving(true);
    try {
      const updated = await saveFlexibleMatchResult(props.matchId, draft, snapshot.events, snapshot.resultUpdatedAt, notes);
      props.onSaved(updated);
      toast.success("Resultado guardado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el resultado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mb-6 space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Editar resultado</h2>
      <p className="text-sm text-muted-foreground">Puedes guardar solo el marcador y completar los goleadores después. No necesitas los minutos.</p>
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {(["own", "rival"] as EventSide[]).map((side) => (
            <div key={side} className="min-w-0 space-y-1.5">
              <Label htmlFor={`score-${side}`} className="block truncate">{side === "own" ? props.teamName : props.opponent}</Label>
              <Input id={`score-${side}`} type="number" inputMode="numeric" min={0} max={99} step={1} required
                value={scores[side]} onChange={(event) => setScores({ ...scores, [side]: event.target.value })} />
            </div>
          ))}
        </div>
        {!validScores && <p role="alert" className="text-sm text-destructive">Ingresa un número entero entre 0 y 99 para cada equipo.</p>}
        {(["own", "rival"] as EventSide[]).map((side) => {
          const remaining = side === "own" ? own.remainingRemovals : rival.remainingRemovals;
          return (
            <section key={side} className="min-w-0 space-y-2">
              <h3 className="truncate text-sm font-semibold">{side === "own" ? props.teamName : props.opponent} · {scores[side] || "—"} goles</h3>
              {remaining > 0 && <p role="alert" className="text-sm text-destructive">Elige {remaining} gol{remaining === 1 ? "" : "es"} para quitar antes de guardar.</p>}
              {draft.map((goal, index) => {
                if (goal.side !== side) return null;
                const original = snapshot.events.find((event) => event.id === goal.id);
                const items = goal.player?.playerId && !(goal.player.playerId in playerItems)
                  ? { ...playerItems, [goal.player.playerId]: "Jugador no disponible" } : playerItems;
                return (
                <div key={goal.id ?? `new-${index}`} className="min-w-0 space-y-2 rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Gol {draft.slice(0, index + 1).filter((item) => item.side === side).length}{original?.minute != null ? ` · ${original.minute}'` : " · Sin minuto"}</p>
                  {original?.note?.trim() && <p className="break-words text-xs text-muted-foreground">{original.note}</p>}
                  {side === "own" ? (
                    <Select items={items} value={goal.player?.playerId ?? "__none__"} disabled={saving}
                      onValueChange={(value) => {
                        if (!value) return;
                        setGoals(draft.map((item, i) => i === index ? {
                          ...item, player: value === "__none__" ? null : { ...item.player, playerId: value },
                        } : item));
                      }}>
                      <SelectTrigger className="w-full min-w-0" aria-label={`Goleador del gol ${draft.slice(0, index + 1).filter((item) => item.side === side).length}`}>
                        <SelectValue className="truncate" />
                      </SelectTrigger>
                      <SelectContent>{Object.entries(items).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <p className="break-words text-sm">{goalLabel(goal)}</p>}
                  {remaining > 0 && <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setGoals(draft.filter((_, i) => i !== index))}>Quitar este gol</Button>}
                </div>
              ); })}
            </section>
          );
        })}
        {removed.length > 0 && (
          <div className="space-y-1 rounded-lg border p-3 text-sm">
            <p className="font-medium">Se quitarán al guardar:</p>
            {removed.map((goal) => <p key={goal.id} className="break-words">{goal.side === "own" ? props.teamName : props.opponent}: {goalLabel({ id: goal.id, side: goal.side, player: goal.player ?? null })}{goal.minute != null ? ` · ${goal.minute}'` : ""}</p>)}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="result-notes">Notas del DT (opcional)</Label>
          <Textarea id="result-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">Guardar marca el partido como finalizado.</p>
        <Button type="submit" className="w-full" disabled={!validScores || own.remainingRemovals > 0 || rival.remainingRemovals > 0 || saving}>{saving ? "Guardando..." : "Guardar resultado"}</Button>
        <Button type="button" variant="outline" className="w-full" onClick={props.onCancel}>Cancelar</Button>
      </fieldset>
    </form>
  );
}
