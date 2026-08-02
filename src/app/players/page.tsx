"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlayersStore } from "@/hooks/use-players";
import { useAuthStore } from "@/hooks/use-auth";
import { PlayerForm } from "@/features/players/player-form";
import { PlayerRow } from "@/features/players/player-row";
import { ImportDialog } from "@/features/players/import-dialog";
import { exportPlayersToJson, searchPlayers, sortPlayers } from "@/services/player-service";
import { Player, PlayerSortField } from "@/types";
import { ArrowLeft, Plus, Upload, Download, Search, KeyRound } from "lucide-react";

const SORT_ITEMS: Record<PlayerSortField, string> = {
  number: "Por número",
  name: "Por nombre",
  primaryPosition: "Por posición",
};

export default function PlayersPage() {
  const { players, loaded, load, addPlayer, addPlayers, updatePlayer, removePlayer } =
    usePlayersStore();
  const { loaded: authLoaded, teamId, role, playerId, load: loadAuth } = useAuthStore();

  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<PlayerSortField>("number");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!authLoaded) loadAuth();
  }, [authLoaded, loadAuth]);

  useEffect(() => {
    if (authLoaded) load();
  }, [authLoaded, teamId, load]);

  const isDt = role === "dt";

  const visiblePlayers = useMemo(() => {
    return sortPlayers(searchPlayers(players, query), sortField);
  }, [players, query, sortField]);

  const existingNumbers = players.map((p) => p.number);

  function handleAddClick() {
    setEditingPlayer(null);
    setFormOpen(true);
  }

  function handleEditClick(player: Player) {
    if (!isDt && player.id !== playerId) return;
    setEditingPlayer(player);
    setFormOpen(true);
  }

  async function handleDelete(player: Player) {
    if (confirm(`¿Eliminar a ${player.name}?`)) {
      await removePlayer(player.id);
    }
  }

  function handleExport() {
    const json = exportPlayersToJson(visiblePlayers);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jugadores-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (authLoaded && !teamId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión con el código de tu equipo para ver la plantilla.
        </p>
        <Link href="/login">
          <Button>
            <KeyRound className="mr-1 h-4 w-4" />
            Ingresar con código
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" aria-label="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Jugadores</h1>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <Select
          items={SORT_ITEMS}
          value={sortField}
          onValueChange={(v) => setSortField(v as PlayerSortField)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="number">Por número</SelectItem>
            <SelectItem value="name">Por nombre</SelectItem>
            <SelectItem value="primaryPosition">Por posición</SelectItem>
          </SelectContent>
        </Select>

        {isDt && (
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1 h-4 w-4" />
              Importar
            </Button>

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={visiblePlayers.length === 0}
            >
              <Download className="mr-1 h-4 w-4" />
              Exportar
            </Button>

            <Button onClick={handleAddClick}>
              <Plus className="mr-1 h-4 w-4" />
              Agregar
            </Button>
          </>
        )}
      </div>

      <div className="space-y-2">
        {visiblePlayers.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {players.length === 0
              ? "Todavía no hay jugadores en el equipo."
              : "Sin resultados para la búsqueda."}
          </p>
        )}
        <AnimatePresence initial={false}>
          {visiblePlayers.map((player) => (
            <motion.div
              key={player.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              <PlayerRow
                player={player}
                onEdit={handleEditClick}
                onDelete={handleDelete}
                canEdit={isDt || player.id === playerId}
                canDelete={isDt}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <PlayerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        player={editingPlayer}
        existingNumbers={existingNumbers}
        restrictedMode={!isDt}
        onSubmit={async (input) => {
          if (editingPlayer) {
            await updatePlayer(editingPlayer.id, input);
          } else {
            await addPlayer(input);
          }
        }}
      />

      {isDt && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          existingNumbers={existingNumbers}
          onImport={async (inputs) => {
            await addPlayers(inputs);
          }}
        />
      )}
    </div>
  );
}
