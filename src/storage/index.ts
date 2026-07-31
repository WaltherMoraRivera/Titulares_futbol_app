import { LocalStorageAdapter } from "./local-storage-adapter";

export * from "./adapter";
export * from "./keys";
export * from "./local-storage-adapter";

// Punto único de instanciación: cambiar a SupabaseAdapter en el futuro
// solo requiere reemplazar esta línea.
export const storageAdapter = new LocalStorageAdapter();
