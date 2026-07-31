import { Position } from "./position";

export type DominantFoot = "izquierdo" | "derecho" | "ambidiestro";

export interface Player {
  id: string;
  name: string;
  number: number;
  primaryPosition: Position;
  secondaryPosition?: Position;
  photoUrl?: string;
  dominantFoot?: DominantFoot;
  active: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlayerInput = Omit<Player, "id" | "createdAt" | "updatedAt">;

export type PlayerSortField = "name" | "number" | "primaryPosition";
