"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Player } from "@/types";
import { PlayerCard } from "./player-card";

interface BenchStripProps {
  bench: Player[];
  onTapPlayer: (player: Player) => void;
}

export function BenchStrip({ bench, onTapPlayer }: BenchStripProps) {
  const { setNodeRef } = useDroppable({ id: "bench" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
  }, [bench.length]);

  function scrollByAmount(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        Banca ({bench.length})
      </p>
      <div className="relative">
        <div
          ref={(node) => {
            setNodeRef(node);
            scrollRef.current = node;
          }}
          id="bench-container"
          onScroll={updateScrollState}
          className="flex min-h-20 gap-2 overflow-x-auto scroll-smooth rounded-xl border border-dashed bg-muted/40 p-2"
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

        {canScrollLeft && (
          <button
            type="button"
            aria-label="Desplazar banca hacia la izquierda"
            onClick={() => scrollByAmount(-1)}
            className="absolute top-1/2 left-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-border"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            aria-label="Desplazar banca hacia la derecha"
            onClick={() => scrollByAmount(1)}
            className="absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-border"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
