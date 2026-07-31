"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePlayersStore } from "@/hooks/use-players";
import { useAttendanceStore } from "@/hooks/use-attendance";
import { useBoardStore } from "@/hooks/use-board";
import { FORMATION_PRESETS } from "@/utils/formation-presets";
import { ArrowLeft } from "lucide-react";

export default function FormationPage() {
  const router = useRouter();
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();
  const { attendeeIds, loaded: attendanceLoaded, load: loadAttendance } = useAttendanceStore();
  const { startFormation } = useBoardStore();

  useEffect(() => {
    if (!playersLoaded) loadPlayers();
    if (!attendanceLoaded) loadAttendance();
  }, [playersLoaded, loadPlayers, attendanceLoaded, loadAttendance]);

  const attendees = useMemo(
    () => players.filter((p) => attendeeIds.includes(p.id)),
    [players, attendeeIds]
  );

  async function handleSelect(templateId: string) {
    await startFormation(templateId, attendees);
    router.push("/board");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/attendance">
          <Button size="icon" variant="ghost" aria-label="Volver a asistencia">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Elegir formación</h1>
      </header>

      {attendees.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Primero marcá los asistentes en la pantalla anterior.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {attendees.length} jugadores asistentes. Elegí un esquema para ubicarlos
            automáticamente; después podés moverlos como quieras.
          </p>
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {FORMATION_PRESETS.map((formation) => (
              <motion.button
                key={formation.id}
                onClick={() => handleSelect(formation.id)}
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                whileTap={{ scale: 0.96 }}
                className="rounded-xl border bg-card p-6 text-center text-lg font-semibold transition-colors hover:border-primary hover:bg-primary/5"
              >
                {formation.label}
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
