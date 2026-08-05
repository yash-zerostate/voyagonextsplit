"use client";

import { API_URL, toResult, unreachable, type ApiResult } from "@/lib/api-shared";

/**
 * Browser-side call to the API.
 *
 * `credentials: "include"` is mandatory: this is a cross-origin request, so
 * without it the browser neither sends the auth cookies nor honours the API's
 * `Set-Cookie` responses.
 */
export async function browserFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    return await toResult<T>(response);
  } catch {
    return unreachable<T>(API_URL);
  }
}
