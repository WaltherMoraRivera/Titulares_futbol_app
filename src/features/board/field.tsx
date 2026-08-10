"use client";

import { forwardRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { GraphicElement, Player, LineupAssignment, Point } from "@/types";
import { PitchBackground } from "./pitch-background";
import { PlayerCard } from "./player-card";
import { InfluenceOverlay } from "./influence-overlay";
import { GraphicsLayer } from "./graphics-layer";
import { ZoneDrawingLayer } from "./zone-drawing-layer";

interface FieldProps {
  assignments: LineupAssignment[];
  playersById: Map<string, Player>;
  onTapPlayer: (player: Player) => void;
  showInfluence?: boolean;
  graphics?: GraphicElement[];
  zoneToolActive?: boolean;
  onZoneComplete?: (points: Point[]) => void;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    assignments,
    playersById,
    onTapPlayer,
    showInfluence = false,
    graphics = [],
    zoneToolActive = false,
    onZoneComplete,
  },
  ref
) {
  const { setNodeRef } = useDroppable({ id: "field" });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      id="field-container"
      className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-inner"
    >
      <PitchBackground />
      {showInfluence && <InfluenceOverlay assignments={assignments} playersById={playersById} />}
      <GraphicsLayer graphics={graphics} assignments={assignments} />
      {onZoneComplete && (
        <ZoneDrawingLayer active={zoneToolActive} onComplete={onZoneComplete} />
      )}
      <AnimatePresence>
        {assignments.map((a) => {
          const player = playersById.get(a.playerId);
          if (!player) return null;
          return (
            <motion.div
              key={a.playerId}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
            >
              <PlayerCard
                player={player}
                position={{ x: a.x, y: a.y }}
                onTap={onTapPlayer}
                hasInstructions={!!a.instructions?.trim()}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});
