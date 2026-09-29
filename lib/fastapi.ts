import "server-only";
import type { ApiError } from "@/lib/types";

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiError };

type Options = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  token?: string;
  participantId?: string;
  headers?: Record<string, string>;
};

const UNREACHABLE: ApiError = {
  code: "UNREACHABLE",
  message: "Can't reach the server. Please try again in a minute.",
};

export async function fastapi<T>(path: string, options: Options = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { ...options.headers };
  headers["X-API-Key"] = process.env.FASTAPI_API_KEY ?? "";

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  if (options.participantId) {
    headers["X-Participant-Id"] = options.participantId;
  }

  let body: string | FormData | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  if (options.formData) {
    body = options.formData;
  }

  let response: Response;
  try {
    response = await fetch(`${process.env.FASTAPI_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, error: UNREACHABLE };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, status: response.status, error: UNREACHABLE };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, error: (json as { error: ApiError }).error };
  }

  return { ok: true, status: response.status, data: json as T };
}
