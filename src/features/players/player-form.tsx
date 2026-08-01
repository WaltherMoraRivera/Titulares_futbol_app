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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { POSITIONS, POSITION_LABELS, Player, PlayerInput } from "@/types";
import { validatePlayerDraft } from "@/utils/validate-player";

interface PlayerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: Player | null;
  existingNumbers: number[];
  onSubmit: (input: PlayerInput) => Promise<void>;
}

const NONE = "__none__";

const FOOT_ITEMS: Record<string, string> = {
  [NONE]: "Sin definir",
  derecho: "Derecho",
  izquierdo: "Izquierdo",
  ambidiestro: "Ambidiestro",
};

const POSITION_ITEMS: Record<string, string> = Object.fromEntries(
  POSITIONS.map((pos) => [pos, `${pos} — ${POSITION_LABELS[pos]}`])
);

const SECONDARY_POSITION_ITEMS: Record<string, string> = {
  [NONE]: "Ninguna",
  ...POSITION_ITEMS,
};

export function PlayerForm({
  open,
  onOpenChange,
  player,
  existingNumbers,
  onSubmit,
}: PlayerFormProps) {
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [showAlias, setShowAlias] = useState(false);
  const [number, setNumber] = useState("");
  const [primaryPosition, setPrimaryPosition] = useState<string>("");
  const [secondaryPosition, setSecondaryPosition] = useState<string>(NONE);
  const [dominantFoot, setDominantFoot] = useState<string>(NONE);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(player?.name ?? "");
      setAlias(player?.alias ?? "");
      setShowAlias(player?.showAlias ?? false);
      setNumber(player ? String(player.number) : "");
      setPrimaryPosition(player?.primaryPosition ?? "");
      setSecondaryPosition(player?.secondaryPosition ?? NONE);
      setDominantFoot(player?.dominantFoot ?? NONE);
      setActive(player?.active ?? true);
      setErrors([]);
    }
  }, [open, player]);

  const otherNumbers = existingNumbers.filter(
    (n) => !player || n !== player.number
  );

  async function handleSubmit() {
    const result = validatePlayerDraft(
      {
        name,
        alias,
        showAlias,
        number,
        primaryPosition,
        secondaryPosition: secondaryPosition === NONE ? "" : secondaryPosition,
        dominantFoot: dominantFoot === NONE ? "" : dominantFoot,
        active,
      },
      otherNumbers
    );

    if (!result.valid || !result.normalized) {
      setErrors(result.errors);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(result.normalized);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{player ? "Editar jugador" : "Agregar jugador"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alias">Alias (opcional)</Label>
            <Input
              id="alias"
              placeholder="Ej: Fideo, Chapa, Tanque..."
              value={alias}
              onChange={(e) => {
                const value = e.target.value;
                setAlias(value);
                if (!value.trim()) setShowAlias(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Útil cuando hay varios jugadores con el mismo nombre.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="showAlias"
              checked={showAlias}
              disabled={!alias.trim()}
              onCheckedChange={(v) => setShowAlias(v === true)}
            />
            <Label htmlFor="showAlias">Mostrar en la app por su alias, no por su nombre</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                type="number"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Pie dominante</Label>
              <Select
                items={FOOT_ITEMS}
                value={dominantFoot}
                onValueChange={(v) => setDominantFoot(v ?? NONE)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin definir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin definir</SelectItem>
                  <SelectItem value="derecho">Derecho</SelectItem>
                  <SelectItem value="izquierdo">Izquierdo</SelectItem>
                  <SelectItem value="ambidiestro">Ambidiestro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Posición principal</Label>
              <Select
                items={POSITION_ITEMS}
                value={primaryPosition}
                onValueChange={(v) => setPrimaryPosition(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegir" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos} — {POSITION_LABELS[pos]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Posición secundaria</Label>
              <Select
                items={SECONDARY_POSITION_ITEMS}
                value={secondaryPosition}
                onValueChange={(v) => setSecondaryPosition(v ?? NONE)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ninguna</SelectItem>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos} — {POSITION_LABELS[pos]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="active"
              checked={active}
              onCheckedChange={(v) => setActive(v === true)}
            />
            <Label htmlFor="active">Jugador activo</Label>
          </div>

          {errors.length > 0 && (
            <ul className="text-sm text-destructive space-y-1">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {player ? "Guardar cambios" : "Agregar jugador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
