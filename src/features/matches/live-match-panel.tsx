"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
import { cn } from "@/lib/utils";
import { useMatchEvents } from "@/hooks/use-match-events";
import { addMatchEvent, removeMatchEvent } from "@/services/supabase-match-service";
import { computeScoreFromEvents } from "@/utils/match-score";
import { getDisplayName } from "@/utils/player-display";
import { EventParticipant, EventSide, Match, MatchEventType, Player } from "@/types";
import { X } from "lucide-react";

const TYPE_LABELS: Record<MatchEventType, string> = {
  goal: "Gol",
  yellow_card: "Amarilla",
  red_card: "Roja",
  substitution: "Cambio",
  comment: "Comentario",
};

const TYPE_ICON: Record<MatchEventType, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
  comment: "💬",
};

function formatPlayerOption(player: Player): string {
  return `${player.number} - ${getDisplayName(player)}`;
}

function formatParticipant(
  participant: EventParticipant | undefined,
  playersById: Map<string, Player>
): string {
  if (!participant) return "";
  if (participant.playerId) {
    const player = playersById.get(participant.playerId);
    return player ? getDisplayName(player) : "Jugador";
  }
  if (participant.number != null && participant.name?.trim()) {
    return `#${participant.number} ${participant.name.trim()}`;
  }
  if (participant.number != null) return `#${participant.number}`;
  return participant.name?.trim() ?? "";
}

interface LiveMatchPanelProps {
  match: Match;
  teamId: string;
  teamName: string | null;
  canEdit: boolean;
  players: Player[];
  isFinished: boolean;
}

export function LiveMatchPanel({
  match,
  teamId,
  teamName,
  canEdit,
  players,
  isFinished,
}: LiveMatchPanelProps) {
  const { events, loaded, setEvents } = useMatchEvents(match.id);
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const [side, setSide] = useState<EventSide>("own");
  const [type, setType] = useState<MatchEventType>("goal");
  const [minute, setMinute] = useState("");
  const [note, setNote] = useState("");
  const [ownPlayerId, setOwnPlayerId] = useState("");
  const [ownPlayerOutId, setOwnPlayerOutId] = useState("");
  const [rivalNumber, setRivalNumber] = useState("");
  const [rivalName, setRivalName] = useState("");
  const [rivalOutNumber, setRivalOutNumber] = useState("");
  const [rivalOutName, setRivalOutName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { teamScore, opponentScore } = useMemo(() => computeScoreFromEvents(events), [events]);

  const ownEvents = useMemo(
    () => events.filter((e) => e.side === "own"),
    [events]
  );
  const rivalEvents = useMemo(
    () => events.filter((e) => e.side === "rival"),
    [events]
  );

  function resetParticipants() {
    setOwnPlayerId("");
    setOwnPlayerOutId("");
    setRivalNumber("");
    setRivalName("");
    setRivalOutNumber("");
    setRivalOutName("");
    setMinute("");
    setNote("");
  }

  function buildParticipant(kind: "main" | "out"): EventParticipant | undefined {
    if (side === "own") {
      const playerId = kind === "main" ? ownPlayerId : ownPlayerOutId;
      return playerId ? { playerId } : undefined;
    }
    const number = kind === "main" ? rivalNumber : rivalOutNumber;
    const name = kind === "main" ? rivalName : rivalOutName;
    if (!number.trim()) return undefined;
    return { number: Number(number), name: name.trim() || undefined };
  }

  async function handleSubmit() {
    const player = type === "comment" ? undefined : buildParticipant("main");
    const playerOut = type === "substitution" ? buildParticipant("out") : undefined;

    if (type === "comment" && !note.trim()) {
      toast.error("Escribe un comentario.");
      return;
    }
    if (type !== "comment" && !player) {
      toast.error(
        side === "own" ? "Elige un jugador de la plantilla." : "Ingresa el dorsal del rival."
      );
      return;
    }
    if (type === "substitution" && !playerOut) {
      toast.error(
        side === "own"
          ? "Elige quién sale de la plantilla."
          : "Ingresa el dorsal de quien sale."
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await addMatchEvent(teamId, match.id, {
        side,
        type,
        minute: minute.trim() ? Number(minute) : undefined,
        player,
        playerOut,
        note: note.trim() || undefined,
      });
      setEvents((prev) =>
        prev.some((e) => e.id === created.id) ? prev : [...prev, created]
      );
      resetParticipants();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo agregar el evento.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await removeMatchEvent(id);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo quitar el evento.");
    }
  }

  const playerItems = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, formatPlayerOption(p)])),
    [players]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 text-center">
        <span
          className={cn(
            "mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
            isFinished ? "bg-muted text-muted-foreground" : "bg-emerald-500/15 text-emerald-500"
          )}
        >
          {isFinished ? "Finalizado" : "En vivo"}
        </span>
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Escudo"
            width={757}
            height={775}
            className="h-16 w-auto"
          />
        </div>
        <p className="mt-2 flex items-center justify-center gap-2 text-lg font-bold">
          <span className="uppercase">{teamName ?? "Nuestro equipo"}</span>
          <span>{teamScore}</span>
          <span className="text-muted-foreground">-</span>
          <span>{opponentScore}</span>
          <span className="uppercase">{match.opponent || "Rival"}</span>
        </p>
      </section>

      {canEdit && (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold text-muted-foreground">Agregar evento</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("own")}
              className={cn(
                "rounded-lg border p-2 text-sm font-medium",
                side === "own" ? "border-primary bg-primary/10" : "border-border"
              )}
            >
              Nuestro equipo
            </button>
            <button
              type="button"
              onClick={() => setSide("rival")}
              className={cn(
                "rounded-lg border p-2 text-sm font-medium",
                side === "rival" ? "border-primary bg-primary/10" : "border-border"
              )}
            >
              Rival
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select items={TYPE_LABELS} value={type} onValueChange={(v) => setType((v as MatchEventType) ?? "goal")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as MatchEventType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_ICON[t]} {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type !== "comment" && (
            <div className="space-y-1.5">
              <Label>{type === "substitution" ? "Entra" : "Jugador"}</Label>
              {side === "own" ? (
                <Select
                  items={playerItems}
                  value={ownPlayerId}
                  onValueChange={(v) => setOwnPlayerId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegir" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {formatPlayerOption(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    className="w-20"
                    type="number"
                    inputMode="numeric"
                    placeholder="Dorsal"
                    value={rivalNumber}
                    onChange={(e) => setRivalNumber(e.target.value)}
                  />
                  <Input
                    className="flex-1"
                    placeholder="Nombre (opcional)"
                    value={rivalName}
                    onChange={(e) => setRivalName(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {type === "substitution" && (
            <div className="space-y-1.5">
              <Label>Sale</Label>
              {side === "own" ? (
                <Select
                  items={playerItems}
                  value={ownPlayerOutId}
                  onValueChange={(v) => setOwnPlayerOutId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegir" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {formatPlayerOption(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    className="w-20"
                    type="number"
                    inputMode="numeric"
                    placeholder="Dorsal"
                    value={rivalOutNumber}
                    onChange={(e) => setRivalOutNumber(e.target.value)}
                  />
                  <Input
                    className="flex-1"
                    placeholder="Nombre (opcional)"
                    value={rivalOutName}
                    onChange={(e) => setRivalOutName(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <div className="w-20 space-y-1.5">
              <Label>Min.</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>{type === "comment" ? "Comentario" : "Nota (opcional)"}</Label>
              <Textarea rows={1} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            Agregar
          </Button>
        </section>
      )}

      <section>
        <p className="mb-2 text-sm font-semibold text-muted-foreground">Minuto a minuto</p>
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay eventos cargados.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              {ownEvents.map((event) => (
                <EventRow key={event.id} event={event} canEdit={canEdit} onRemove={handleRemove} playersById={playersById} />
              ))}
            </div>
            <div className="space-y-2">
              {rivalEvents.map((event) => (
                <EventRow key={event.id} event={event} canEdit={canEdit} onRemove={handleRemove} playersById={playersById} align="right" />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function EventRow({
  event,
  canEdit,
  onRemove,
  playersById,
  align = "left",
}: {
  event: import("@/types").MatchEvent;
  canEdit: boolean;
  onRemove: (id: string) => void;
  playersById: Map<string, Player>;
  align?: "left" | "right";
}) {
  const who = formatParticipant(event.player, playersById);
  const whoOut = formatParticipant(event.playerOut, playersById);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-2 text-xs",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      <div className={cn("flex items-center gap-1.5", align === "right" && "flex-row-reverse")}>
        <span>{TYPE_ICON[event.type]}</span>
        {event.minute != null && (
          <span className="font-mono text-muted-foreground">{event.minute}&apos;</span>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => onRemove(event.id)}
            aria-label="Quitar evento"
            className="ml-auto text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {event.type === "substitution" ? (
        <p className="mt-0.5 font-medium">
          {who || "?"} <span className="text-muted-foreground">por</span> {whoOut || "?"}
        </p>
      ) : who ? (
        <p className="mt-0.5 font-medium">{who}</p>
      ) : null}
      {event.note?.trim() && <p className="mt-0.5 text-muted-foreground">{event.note}</p>}
    </div>
  );
}
