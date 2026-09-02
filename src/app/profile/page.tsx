"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/hooks/use-auth";
import { usePlayersStore } from "@/hooks/use-players";
import { PlayerForm } from "@/features/players/player-form";
import { ClaimOrRegisterPlayer } from "@/features/players/claim-or-register";
import { ArrowLeft, KeyRound } from "lucide-react";

/** "Mi perfil": punto de entrada único desde el inicio para ver/editar los
 * propios datos, sin importar si la persona ya reclamó un jugador o no —
 * cubre el caso de alguien que entró con el código pero nunca completó ese
 * paso. Si ya tiene un jugador reclamado, abre su ficha para editarla; si
 * no, ofrece la misma lista de reclamar/registrarse que usa /login. */
export default function ProfilePage() {
  const router = useRouter();
  const { loaded: authLoaded, teamId, teamName, playerId, load: loadAuth } = useAuthStore();
  const { players, loaded: playersLoaded, load: loadPlayers, updatePlayer } = usePlayersStore();

  useEffect(() => {
    if (!authLoaded) loadAuth();
  }, [authLoaded, loadAuth]);

  useEffect(() => {
    if (authLoaded && teamId) loadPlayers();
  }, [authLoaded, teamId, loadPlayers]);

  if (authLoaded && !teamId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inicia sesión con el código de tu equipo para ver tu perfil.
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

  const own = playerId ? players.find((p) => p.id === playerId) : null;
  const existingNumbers = players.map((p) => p.number);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" aria-label="Volver al inicio">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Mi perfil</h1>
      </div>

      {!authLoaded || !playersLoaded ? (
        <p className="text-center text-sm text-muted-foreground">Cargando...</p>
      ) : playerId && own ? (
        <PlayerForm
          open
          onOpenChange={(open) => {
            if (!open) router.push("/");
          }}
          player={own}
          existingNumbers={existingNumbers}
          restrictedMode
          onSubmit={async (input) => {
            await updatePlayer(own.id, input);
            router.push("/");
          }}
        />
      ) : playerId && !own ? (
        <p className="text-center text-sm text-muted-foreground">
          No se encontró tu jugador en la plantilla.
        </p>
      ) : (
        <ClaimOrRegisterPlayer teamName={teamName} onDone={() => router.push("/")} />
      )}
    </div>
  );
}
