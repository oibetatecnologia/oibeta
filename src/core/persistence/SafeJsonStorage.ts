export interface SafeJsonStorageOptions<T> {
  key: string;
  fallback: T;
  label: string;
}

export class SafeJsonStorage {
  static read<T>({ key, fallback, label }: SafeJsonStorageOptions<T>): T {
    if (typeof window === 'undefined') {
      return fallback;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;

      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn(`[Persistence] Falha ao carregar ${label}.`, error);
      return fallback;
    }
  }

  static write<T>(key: string, value: T, label: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[Persistence] Falha ao salvar ${label}.`, error);
    }
  }

  static remove(key: string, label: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Persistence] Falha ao remover ${label}.`, error);
    }
  }
}
