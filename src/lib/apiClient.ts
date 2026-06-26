import type { PaginatedMeta } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  code: string;

  constructor(message: string, code = 'API_ERROR') {
    super(message);
    this.code = code;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginatedMeta;
  error?: { code: string; message: string };
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem('refreshToken');
}

export function setTokens(accessToken: string, refreshToken: string): void {
  sessionStorage.setItem('accessToken', accessToken);
  sessionStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens(): void {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; meta?: PaginatedMeta }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let payload: ApiEnvelope<T>;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Invalid server response', 'INVALID_RESPONSE');
  }

  if (!response.ok || !payload.success) {
    throw new ApiError(
      payload.error?.message || 'Request failed',
      payload.error?.code || 'REQUEST_FAILED',
    );
  }

  return { data: payload.data, meta: payload.meta };
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}
