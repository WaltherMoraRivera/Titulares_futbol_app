"use client";

import { forwardRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { Player } from "@/types";
import { PlayerCard } from "./player-card";

interface BenchStripProps {
  bench: Player[];
  onTapPlayer: (player: Player) => void;
}

export const BenchStrip = forwardRef<HTMLDivElement, BenchStripProps>(function BenchStrip(
  { bench, onTapPlayer },
  ref
) {
  const { setNodeRef } = useDroppable({ id: "bench" });

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        Banca ({bench.length})
      </p>
      <div
        ref={(node) => {
          setNodeRef(node);
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        id="bench-container"
        className="flex min-h-20 gap-2 overflow-x-auto rounded-xl border border-dashed bg-muted/40 p-2"
      >
        {bench.length === 0 && (
          <p className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            Sin jugadores en banca
          </p>
        )}
        <AnimatePresence initial={false}>
          {bench.map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.2 }}
            >
              <PlayerCard player={player} onTap={onTapPlayer} variant="bench" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
