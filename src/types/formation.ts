import { Position } from "./position";

export interface FormationSlot {
  id: string;
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  suggestedPosition: Position;
}

export interface FormationTemplate {
  id: string; // "4-4-2", "4-3-3", etc.
  label: string;
  slots: FormationSlot[];
}
