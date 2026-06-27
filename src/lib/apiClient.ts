import type { PaginatedMeta } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const REQUEST_TIMEOUT_MS = 15_000;
export const ML_TRAINING_TIMEOUT_MS = 600_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The backend may be stuck — restart it on port 8000 and try again.',
        'TIMEOUT',
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

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
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<{ data: T; meta?: PaginatedMeta }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE}${path}`, {
      ...options,
      headers,
    }, timeoutMs);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'Cannot reach the API server. Make sure the backend is running on port 8000.',
      'NETWORK_ERROR',
    );
  }

  let payload: ApiEnvelope<T>;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      response.ok
        ? 'Invalid server response'
        : 'Server error — the backend may be restarting. Try again in a moment.',
      'INVALID_RESPONSE',
    );
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

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as ApiEnvelope<unknown>;
    return new ApiError(payload.error?.message || 'Request failed', payload.error?.code || 'REQUEST_FAILED');
  } catch {
    return new ApiError('Request failed', 'REQUEST_FAILED');
  }
}

export async function downloadFile(
  path: string,
  filename: string,
  params: Record<string, string | number | undefined> = {},
  options: { expectedContentType?: string } = {},
): Promise<void> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetchWithTimeout(`${API_BASE}${path}${buildQuery(params)}`, { headers });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream';
  if (options.expectedContentType && !contentType.startsWith(options.expectedContentType)) {
    throw new ApiError(
      `Export returned ${contentType} instead of ${options.expectedContentType}. Restart the backend on port 8000 and try again.`,
      'INVALID_EXPORT',
    );
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/i);
  const resolvedFilename = filenameMatch?.[1] ?? filename;
  const buffer = await response.arrayBuffer();
  const blob = new Blob([buffer], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = resolvedFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function uploadFile<T>(
  path: string,
  file: File,
  fieldName = 'file',
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  }, 120_000);

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

  return payload.data;
}
