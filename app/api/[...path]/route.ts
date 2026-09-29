import { fastapi } from "@/lib/fastapi";
import { getParticipantId, getToken } from "@/lib/session";

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function isAllowed(method: string, path: string[]) {
  if (path[0] !== "bills") {
    return false;
  }

  if (method === "GET" && path.length === 2) {
    return true;
  }

  if ((method === "PUT" || method === "DELETE") && path.length === 4 && path[2] === "claims") {
    return true;
  }

  return false;
}

async function forward(request: Request, context: RouteContext<"/api/[...path]">) {
  const { path } = await context.params;
  if (!isAllowed(request.method, path)) {
    return errorResponse(404, "NOT_FOUND", "Not found");
  }

  const parts = [];
  for (const part of path) {
    parts.push(encodeURIComponent(part));
  }
  let target = `/${parts.join("/")}`;

  const since = new URL(request.url).searchParams.get("since");
  if (request.method === "GET" && since !== null) {
    target += `?since=${encodeURIComponent(since)}`;
  }

  let body;
  if (request.method === "PUT") {
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "BAD_REQUEST", "Send the number of units");
    }
  }

  const result = await fastapi(target, {
    method: request.method,
    body,
    token: await getToken(),
    participantId: await getParticipantId(path[1]),
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data, { status: result.status });
}

export const GET = forward;
export const PUT = forward;
export const DELETE = forward;
