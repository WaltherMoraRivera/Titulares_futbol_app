"use client";

import { useState } from "react";
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
import { Loader2, Download } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialOpponent?: string;
  initialKickoffTime?: string;
  onGenerate: (meta: { opponent: string; kickoffTime: string }) => Promise<void>;
}

export function ShareDialog({
  open,
  onOpenChange,
  initialOpponent,
  initialKickoffTime,
  onGenerate,
}: ShareDialogProps) {
  const [opponent, setOpponent] = useState(initialOpponent ?? "");
  const [kickoffTime, setKickoffTime] = useState(initialKickoffTime ?? "");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await onGenerate({ opponent, kickoffTime });
      onOpenChange(false);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Compartir formación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="opponent">Rival (opcional)</Label>
            <Input
              id="opponent"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Club Atlético..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kickoff">Hora (opcional)</Label>
            <Input
              id="kickoff"
              value={kickoffTime}
              onChange={(e) => setKickoffTime(e.target.value)}
              placeholder="20:00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            Generar imagen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
