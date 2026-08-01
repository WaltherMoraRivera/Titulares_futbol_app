import { Player } from "@/types";

/**
 * Nombre a mostrar en la UI. Si el jugador tiene alias activado, se usa
 * el alias completo; si no, el nombre real (o solo el primer nombre en
 * contextos compactos como las tarjetas de la cancha/banca).
 */
export function getDisplayName(player: Player, options?: { short?: boolean }): string {
  const alias = player.alias?.trim();
  if (player.showAlias && alias) return alias;
  return options?.short ? player.name.split(" ")[0] : player.name;
}
