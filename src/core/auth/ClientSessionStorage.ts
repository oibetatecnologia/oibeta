export interface StoredClientSession<User = unknown> {
  user: User;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  storedAt: string;
}

const SESSION_STORAGE_KEY = 'oi_beta_auth_session';
const LEGACY_USER_STORAGE_KEY = 'oi_beta_auth_user';
const REFRESH_MARGIN_SECONDS = 300;

const isProductionHost = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  return hostname === 'oibeta.com.br' || hostname.endsWith('.oibeta.com.br');
};

const storage = () => isProductionHost() ? window.sessionStorage : window.localStorage;

const decodeJwtExpiration = (token?: string): number | undefined => {
  if (!token || token.startsWith('mock-')) return undefined;

  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalized));
    return typeof decoded?.exp === 'number' ? decoded.exp : undefined;
  } catch {
    return undefined;
  }
};

export class ClientSessionStorage {
  private static refreshInFlight: Promise<boolean> | null = null;

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

  static write<User>(
    user: User,
    accessToken?: string,
    refreshToken?: string,
    expiresAt?: number,
  ): void {
    if (typeof window === 'undefined') return;

    const current = this.read<User>();
    const resolvedAccessToken = accessToken || current?.accessToken;
    const resolvedRefreshToken = refreshToken || current?.refreshToken;
    const resolvedExpiresAt = expiresAt || current?.expiresAt || decodeJwtExpiration(resolvedAccessToken);

    storage().setItem(SESSION_STORAGE_KEY, JSON.stringify({
      user,
      accessToken: resolvedAccessToken || undefined,
      refreshToken: resolvedRefreshToken || undefined,
      expiresAt: resolvedExpiresAt,
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

  static getRefreshToken(): string | undefined {
    return this.read()?.refreshToken;
  }

  static getExpiresAt(): number | undefined {
    const session = this.read();
    return session?.expiresAt || decodeJwtExpiration(session?.accessToken);
  }

  static isAccessTokenExpiring(marginSeconds = REFRESH_MARGIN_SECONDS): boolean {
    const token = this.getAccessToken();
    if (!token || token.startsWith('mock-')) return false;

    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return true;
    return expiresAt <= Math.floor(Date.now() / 1000) + marginSeconds;
  }

  static async ensureFreshSession(marginSeconds = REFRESH_MARGIN_SECONDS): Promise<boolean> {
    const session = this.read();
    if (!session?.accessToken) return false;
    if (session.accessToken.startsWith('mock-')) return true;
    if (!this.isAccessTokenExpiring(marginSeconds)) return true;
    if (!session.refreshToken) return false;

    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });

        const data = await response.json().catch(() => null) as any;
        if (!response.ok || !data?.token) return false;

        this.write(
          session.user,
          data.token,
          data.refreshToken || session.refreshToken,
          data.expiresAt,
        );
        return true;
      } catch {
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  static buildAuthorizationHeader(): Record<string, string> {
    const token = this.getAccessToken();
    if (!token) return {};
    if (isProductionHost() && token.startsWith('mock-')) return {};
    return { Authorization: `Bearer ${token}` };
  }
}
