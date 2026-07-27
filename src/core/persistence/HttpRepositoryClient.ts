import {
  buildTenantHeaders,
  buildTenantQuery,
  type TenantPersistenceContext,
} from './TenantPersistence';

const DEFAULT_TIMEOUT_MS = 12_000;

export class HttpRepositoryClient {
  static buildUrl(
    path: string,
    context?: Partial<TenantPersistenceContext>,
  ): string {
    const query = buildTenantQuery(context);

    return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
  }

  static async get<T>(
    path: string,
    context?: Partial<TenantPersistenceContext>,
  ): Promise<T> {
    return this.request<T>(
      this.buildUrl(path, context),
      {
        method: 'GET',
        headers: buildTenantHeaders(context),
      },
    );
  }

  static async post<T>(
    path: string,
    body: unknown,
    context?: Partial<TenantPersistenceContext>,
  ): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: buildTenantHeaders(context),
      body: JSON.stringify(body),
    });
  }

  static async put<T>(
    path: string,
    body: unknown,
    context?: Partial<TenantPersistenceContext>,
  ): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      headers: buildTenantHeaders(context),
      body: JSON.stringify(body),
    });
  }

  static async patch<T>(
    path: string,
    body: unknown,
    context?: Partial<TenantPersistenceContext>,
  ): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      headers: buildTenantHeaders(context),
      body: JSON.stringify(body),
    });
  }

  static async delete<T>(
    path: string,
    context?: Partial<TenantPersistenceContext>,
  ): Promise<T> {
    return this.request<T>(
      this.buildUrl(path, context),
      {
        method: 'DELETE',
        headers: buildTenantHeaders(context),
      },
    );
  }

  static async request<T>(
    url: string,
    init: RequestInit,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      return await this.readJsonOrThrow<T>(response);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  static async readJsonOrThrow<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(message || `Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
