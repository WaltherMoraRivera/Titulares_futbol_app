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
  half_time: "Fin 1er tiempo",
  full_time: "Fin del partido",
};

const TYPE_ICON: Record<MatchEventType, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
  comment: "💬",
  half_time: "⏸️",
  full_time: "🏁",
};

/** Los marcadores de fin de tiempo no son de "nuestro equipo" ni del
 * rival — solo sirven para separar la bitácora en Primer/Segundo tiempo. */
function isHalfMarker(type: MatchEventType) {
  return type === "half_time" || type === "full_time";
}

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

function earliestOfType(
  events: import("@/types").MatchEvent[],
  type: MatchEventType
): import("@/types").MatchEvent | undefined {
  return events
    .filter((e) => e.type === type)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))[0];
}

/** Reparte los eventos de un lado en los tres tramos del partido, según
 * los minutos de los marcadores de fin de tiempo (si están cargados). Un
 * evento sin minuto cargado queda en el primer tramo abierto. */
function splitByHalves(
  events: import("@/types").MatchEvent[],
  halfMinute: number | undefined,
  fullMinute: number | undefined
) {
  const first: import("@/types").MatchEvent[] = [];
  const second: import("@/types").MatchEvent[] = [];
  const extra: import("@/types").MatchEvent[] = [];
  for (const e of events) {
    const m = e.minute;
    if (halfMinute != null && m != null && m > halfMinute) {
      if (fullMinute != null && m > fullMinute) extra.push(e);
      else second.push(e);
    } else {
      first.push(e);
    }
  }
  return { first, second, extra };
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

  // El primero cargado de cada marcador manda si por error se cargó más de uno.
  const halfTimeEvent = useMemo(
    () => earliestOfType(events, "half_time"),
    [events]
  );
  const fullTimeEvent = useMemo(
    () => earliestOfType(events, "full_time"),
    [events]
  );

  const displayEvents = useMemo(
    () => events.filter((e) => !isHalfMarker(e.type)),
    [events]
  );
  const ownEvents = useMemo(
    () => displayEvents.filter((e) => e.side === "own"),
    [displayEvents]
  );
  const rivalEvents = useMemo(
    () => displayEvents.filter((e) => e.side === "rival"),
    [displayEvents]
  );

  const ownHalves = useMemo(
    () => splitByHalves(ownEvents, halfTimeEvent?.minute, fullTimeEvent?.minute),
    [ownEvents, halfTimeEvent, fullTimeEvent]
  );
  const rivalHalves = useMemo(
    () => splitByHalves(rivalEvents, halfTimeEvent?.minute, fullTimeEvent?.minute),
    [rivalEvents, halfTimeEvent, fullTimeEvent]
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
    const marker = isHalfMarker(type);
    const player = type === "comment" || marker ? undefined : buildParticipant("main");
    const playerOut = type === "substitution" ? buildParticipant("out") : undefined;

    if (type === "comment" && !note.trim()) {
      toast.error("Escribe un comentario.");
      return;
    }
    if (marker && !minute.trim()) {
      toast.error("Ingresa el minuto.");
      return;
    }
    if (type !== "comment" && !marker && !player) {
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
        side: marker ? "own" : side,
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

  const isMarkerType = isHalfMarker(type);

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

          {!isMarkerType && (
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
          )}

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

          {type !== "comment" && !isMarkerType && (
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
        ) : !halfTimeEvent && !fullTimeEvent ? (
          <EventGrid own={ownEvents} rival={rivalEvents} canEdit={canEdit} onRemove={handleRemove} playersById={playersById} />
        ) : (
          <div className="space-y-3">
            <EventGrid own={ownHalves.first} rival={rivalHalves.first} canEdit={canEdit} onRemove={handleRemove} playersById={playersById} />
            {halfTimeEvent && (
              <HalfDivider
                label="Entretiempo"
                minute={halfTimeEvent.minute}
                canEdit={canEdit}
                onRemove={() => handleRemove(halfTimeEvent.id)}
              />
            )}
            {(ownHalves.second.length > 0 || rivalHalves.second.length > 0 || !fullTimeEvent) && (
              <EventGrid own={ownHalves.second} rival={rivalHalves.second} canEdit={canEdit} onRemove={handleRemove} playersById={playersById} />
            )}
            {fullTimeEvent && (
              <HalfDivider
                label="Fin del partido"
                minute={fullTimeEvent.minute}
                canEdit={canEdit}
                onRemove={() => handleRemove(fullTimeEvent.id)}
              />
            )}
            {(ownHalves.extra.length > 0 || rivalHalves.extra.length > 0) && (
              <EventGrid own={ownHalves.extra} rival={rivalHalves.extra} canEdit={canEdit} onRemove={handleRemove} playersById={playersById} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function EventGrid({
  own,
  rival,
  canEdit,
  onRemove,
  playersById,
}: {
  own: import("@/types").MatchEvent[];
  rival: import("@/types").MatchEvent[];
  canEdit: boolean;
  onRemove: (id: string) => void;
  playersById: Map<string, Player>;
}) {
  if (own.length === 0 && rival.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        {own.map((event) => (
          <EventRow key={event.id} event={event} canEdit={canEdit} onRemove={onRemove} playersById={playersById} />
        ))}
      </div>
      <div className="space-y-2">
        {rival.map((event) => (
          <EventRow key={event.id} event={event} canEdit={canEdit} onRemove={onRemove} playersById={playersById} align="right" />
        ))}
      </div>
    </div>
  );
}

function HalfDivider({
  label,
  minute,
  canEdit,
  onRemove,
}: {
  label: string;
  minute: number | undefined;
  canEdit: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-border" />
      <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        {label}
        {minute != null ? ` · ${minute}'` : ""}
        {canEdit && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar marca de ${label.toLowerCase()}`}
            className="hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
      <div className="h-px flex-1 bg-border" />
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
