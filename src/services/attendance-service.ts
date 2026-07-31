import { storageAdapter, STORAGE_KEYS } from "@/storage";

export async function loadAttendance(): Promise<string[]> {
  return (await storageAdapter.get<string[]>(STORAGE_KEYS.currentAttendance)) ?? [];
}

export async function saveAttendance(playerIds: string[]): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.currentAttendance, playerIds);
}
