import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { env } from './env';
if (!env) throw new Error('Frontend environment is unavailable');
export const API_URL = env.VITE_API_URL;
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: { credentials: 'include' },
  plugins: [
    inferAdditionalFields({
      user: { role: { type: 'string', input: false, defaultValue: 'user' } },
    }),
  ],
});
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? body.error : null;
    throw new ApiError(
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Unable to complete your request',
      response.status,
      error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined,
    );
  }
  return body as T;
}
