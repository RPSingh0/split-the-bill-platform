import "server-only";

export type ApiError = {
  code: string;
  message: string;
  [key: string]: unknown;
};

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiError };

type Options = {
  method?: string;
  body?: unknown;
  token?: string;
  participantId?: string;
};

const UNREACHABLE: ApiError = {
  code: "UNREACHABLE",
  message: "Can't reach the server. Please try again in a minute.",
};

export async function fastapi<T>(path: string, options: Options = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { "X-API-Key": process.env.FASTAPI_API_KEY ?? "" };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  if (options.participantId) {
    headers["X-Participant-Id"] = options.participantId;
  }

  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
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
