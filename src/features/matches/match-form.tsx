"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Match, MatchInput } from "@/types";

interface MatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match?: Match | null;
  onSubmit: (input: MatchInput) => Promise<void>;
}

export function MatchForm({ open, onOpenChange, match, onSubmit }: MatchFormProps) {
  const [date, setDate] = useState("");
  const [kickoffTime, setKickoffTime] = useState("");
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(match?.date ?? new Date().toISOString().slice(0, 10));
      setKickoffTime(match?.kickoffTime ?? "");
      setOpponent(match?.opponent ?? "");
      setLocation(match?.location ?? "");
      setError(null);
    }
  }, [open, match]);

  async function handleSubmit() {
    if (!date) {
      setError("La fecha es obligatoria.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        date,
        kickoffTime: kickoffTime || undefined,
        opponent: opponent.trim() || undefined,
        location: location.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el partido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{match ? "Editar partido" : "Agendar partido"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={kickoffTime}
                onChange={(e) => setKickoffTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opponent">Rival (opcional)</Label>
            <Input
              id="opponent"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Ej: Deportivo Rival"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Lugar (opcional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Cancha municipal"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {match ? "Guardar cambios" : "Agendar partido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
