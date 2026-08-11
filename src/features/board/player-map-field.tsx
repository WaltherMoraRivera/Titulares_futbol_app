"use client";

import { LineupAssignment, Player, Point, ZoneGraphic } from "@/types";
import { PitchBackground } from "./pitch-background";
import { PlayerCardVisual } from "./player-card-visual";
import { PlayerMapLayer } from "./player-map-layer";
import { ZoneDrawingLayer } from "./zone-drawing-layer";

interface ConnectedEntry {
  player: Player;
  assignment: LineupAssignment;
}

interface PlayerMapFieldProps {
  owner: Player;
  ownerAssignment: LineupAssignment;
  connected: ConnectedEntry[];
  zones: ZoneGraphic[];
  zoneToolActive?: boolean;
  onZoneComplete?: (points: Point[]) => void;
}

/** Mini-cancha del mapa táctico individual: solo el jugador enfocado y los
 * compañeros que el DT seleccionó para su mapa, sin drag & drop (las
 * posiciones vienen de la formación general, no se editan acá). */
export function PlayerMapField({
  owner,
  ownerAssignment,
  connected,
  zones,
  zoneToolActive = false,
  onZoneComplete,
}: PlayerMapFieldProps) {
  return (
    <div
      id="field-container"
      className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-inner"
    >
      <PitchBackground />
      <PlayerMapLayer
        ownerAssignment={ownerAssignment}
        connectedAssignments={connected.map((c) => c.assignment)}
        zones={zones}
      />
      {onZoneComplete && <ZoneDrawingLayer active={zoneToolActive} onComplete={onZoneComplete} />}

      <div
        className="absolute flex min-h-[64px] min-w-[56px] flex-col items-center justify-center gap-1"
        style={{
          left: `${ownerAssignment.x}%`,
          top: `${ownerAssignment.y}%`,
          translate: "-50% -50%",
        }}
      >
        <PlayerCardVisual
          player={owner}
          variant="field"
          hasInstructions={!!ownerAssignment.instructions?.trim()}
        />
      </div>

      {connected.map(({ player, assignment }) => (
        <div
          key={player.id}
          className="absolute flex min-h-[64px] min-w-[56px] flex-col items-center justify-center gap-1"
          style={{
            left: `${assignment.x}%`,
            top: `${assignment.y}%`,
            translate: "-50% -50%",
          }}
        >
          <PlayerCardVisual player={player} variant="field" />
        </div>
      ))}
    </div>
  );
}
