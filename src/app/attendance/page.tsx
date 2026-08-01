"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlayersStore } from "@/hooks/use-players";
import { useAttendanceStore } from "@/hooks/use-attendance";
import { AttendanceRow } from "@/features/attendance/attendance-row";
import { searchPlayers, sortPlayers } from "@/services/player-service";
import { ArrowLeft, Search, Users } from "lucide-react";

export default function AttendancePage() {
  const { players, loaded: playersLoaded, load: loadPlayers } = usePlayersStore();
  const {
    attendeeIds,
    loaded: attendanceLoaded,
    load: loadAttendance,
    toggle,
    setAll,
    clearAll,
  } = useAttendanceStore();

  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!playersLoaded) loadPlayers();
    if (!attendanceLoaded) loadAttendance();
  }, [playersLoaded, loadPlayers, attendanceLoaded, loadAttendance]);

  const activePlayers = useMemo(() => players.filter((p) => p.active), [players]);

  const visiblePlayers = useMemo(
    () => sortPlayers(searchPlayers(activePlayers, query), "number"),
    [activePlayers, query]
  );

  const allSelected =
    activePlayers.length > 0 && activePlayers.every((p) => attendeeIds.includes(p.id));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-4 pb-28">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" aria-label="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-semibold">Asistencia</h1>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {attendeeIds.length}/{activePlayers.length}
        </span>
      </header>

      {activePlayers.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay jugadores activos todavía.{" "}
          <Link href="/players" className="underline">
            Agrega tu plantilla
          </Link>{" "}
          para poder marcar asistencia.
        </p>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() =>
                allSelected ? clearAll() : setAll(activePlayers.map((p) => p.id))
              }
            >
              {allSelected ? "Ninguno" : "Todos"}
            </Button>
          </div>

          <motion.div
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.03 } },
            }}
          >
            {visiblePlayers.map((player) => (
              <motion.div
                key={player.id}
                variants={{
                  hidden: { opacity: 0, y: -6 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <AttendanceRow
                  player={player}
                  checked={attendeeIds.includes(player.id)}
                  onToggle={toggle}
                />
              </motion.div>
            ))}
          </motion.div>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
        <div className="mx-auto max-w-2xl">
          <Link href="/formation">
            <Button className="w-full" size="lg" disabled={attendeeIds.length === 0}>
              Continuar ({attendeeIds.length} asistentes) →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
