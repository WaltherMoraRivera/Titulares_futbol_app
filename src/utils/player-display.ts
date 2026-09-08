import { Player } from "@/types";

/**
 * Nombre a mostrar en la UI. El alias es siempre un dato opcional que
 * acompaña al nombre real, nunca lo reemplaza: si está cargado, se
 * muestra entre paréntesis después del nombre (ej. "Juan Pérez (Fideo)").
 * En contextos compactos (cancha/banca) se prioriza el alias solo si
 * existe, por espacio; si no hay alias, se usa el primer nombre.
 */
export function getDisplayName(player: Player, options?: { short?: boolean }): string {
  const alias = player.alias?.trim();
  if (options?.short) return alias || player.name.split(" ")[0];
  return alias ? `${player.name} (${alias})` : player.name;
}
