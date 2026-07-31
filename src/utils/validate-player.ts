import { POSITIONS, Position } from "@/types";

export interface PlayerDraft {
  name: string;
  number: number | string;
  primaryPosition: string;
  secondaryPosition?: string;
  dominantFoot?: string;
  active?: boolean | string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  normalized?: {
    name: string;
    number: number;
    primaryPosition: Position;
    secondaryPosition?: Position;
    dominantFoot?: "izquierdo" | "derecho" | "ambidiestro";
    active: boolean;
  };
}

const FOOT_VALUES = ["izquierdo", "derecho", "ambidiestro"];

function isPosition(value: string): value is Position {
  return (POSITIONS as readonly string[]).includes(value);
}

export function validatePlayerDraft(
  draft: PlayerDraft,
  existingNumbers: number[] = []
): ValidationResult {
  const errors: string[] = [];

  const name = draft.name?.trim();
  if (!name) errors.push("El nombre es obligatorio.");

  const number = typeof draft.number === "string" ? Number(draft.number) : draft.number;
  if (!Number.isInteger(number) || number <= 0) {
    errors.push("El número debe ser un entero positivo.");
  } else if (existingNumbers.includes(number)) {
    errors.push(`El número ${number} ya está en uso.`);
  }

  const primaryPosition = draft.primaryPosition?.trim().toUpperCase();
  if (!primaryPosition || !isPosition(primaryPosition)) {
    errors.push(
      `Posición principal inválida. Usar una de: ${POSITIONS.join(", ")}.`
    );
  }

  let secondaryPosition: Position | undefined;
  if (draft.secondaryPosition && draft.secondaryPosition.trim()) {
    const sp = draft.secondaryPosition.trim().toUpperCase();
    if (!isPosition(sp)) {
      errors.push(
        `Posición secundaria inválida. Usar una de: ${POSITIONS.join(", ")}.`
      );
    } else {
      secondaryPosition = sp;
    }
  }

  let dominantFoot: "izquierdo" | "derecho" | "ambidiestro" | undefined;
  if (draft.dominantFoot && draft.dominantFoot.trim()) {
    const foot = draft.dominantFoot.trim().toLowerCase();
    if (!FOOT_VALUES.includes(foot)) {
      errors.push(`Pie dominante inválido. Usar uno de: ${FOOT_VALUES.join(", ")}.`);
    } else {
      dominantFoot = foot as "izquierdo" | "derecho" | "ambidiestro";
    }
  }

  const active =
    typeof draft.active === "string"
      ? ["true", "1", "activo", "si", "sí"].includes(draft.active.trim().toLowerCase())
      : draft.active ?? true;

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    normalized: {
      name,
      number,
      primaryPosition: primaryPosition as Position,
      secondaryPosition,
      dominantFoot,
      active,
    },
  };
}
