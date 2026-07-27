export interface StoredClientSession<User = unknown> {
  user: User;
  accessToken?: string;
  storedAt: string;
}

const SESSION_STORAGE_KEY = 'oi_beta_auth_session';
const LEGACY_USER_STORAGE_KEY = 'oi_beta_auth_user';

const isProductionHost = () => typeof window !== 'undefined' && window.location.hostname === 'app.oibeta.com.br';
const storage = () => isProductionHost() ? window.sessionStorage : window.localStorage;

export class ClientSessionStorage {
  static read<User>(): StoredClientSession<User> | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = storage().getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredClientSession<User>;
        if (parsed && typeof parsed === 'object' && parsed.user) return parsed;
      }

      const legacyUser = storage().getItem(LEGACY_USER_STORAGE_KEY);
      if (!legacyUser) return null;

      return {
        user: JSON.parse(legacyUser) as User,
        storedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  static write<User>(user: User, accessToken?: string): void {
    if (typeof window === 'undefined') return;

    storage().setItem(SESSION_STORAGE_KEY, JSON.stringify({
      user,
      accessToken: accessToken || undefined,
      storedAt: new Date().toISOString(),
    } satisfies StoredClientSession<User>));
    storage().setItem(LEGACY_USER_STORAGE_KEY, JSON.stringify(user));
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  }

  static getAccessToken(): string | undefined {
    return this.read()?.accessToken;
  }

  static buildAuthorizationHeader(): Record<string, string> {
    const token = this.getAccessToken();
    if (!token) return {};
    if (isProductionHost() && token.startsWith('mock-')) return {};
    return { Authorization: `Bearer ${token}` };
  }
}
