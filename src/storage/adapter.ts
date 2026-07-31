/**
 * Contrato de persistencia. LocalStorageAdapter es la implementación actual;
 * una futura SupabaseAdapter/FirebaseAdapter implementa la misma interfaz
 * sin que services/ ni features/ necesiten cambiar.
 */
export interface IStorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
