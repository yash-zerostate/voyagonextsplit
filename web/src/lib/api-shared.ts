/**
 * Types and response parsing shared by the server and browser API helpers.
 * Deliberately free of `next/headers` and of `window` — both sides import it.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5002";

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code: string; message: string; fields?: Record<string, string> };

type ErrorBody = { error?: { code?: string; message?: string; fields?: Record<string, string> } };

export async function toResult<T>(response: Response): Promise<ApiResult<T>> {
  const body = await response.json().catch(() => null);
  if (response.ok) return { ok: true, status: response.status, data: body as T };
  const error = (body as ErrorBody | null)?.error;
  return {
    ok: false,
    status: response.status,
    code: error?.code ?? "request_failed",
    message: error?.message ?? "Request failed.",
    fields: error?.fields,
  };
}

export function unreachable<T>(url: string): ApiResult<T> {
  return {
    ok: false,
    status: 503,
    code: "api_unreachable",
    message: `Could not reach the API at ${url}. Is it running?`,
  };
}
