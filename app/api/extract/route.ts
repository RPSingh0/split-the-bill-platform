import { cookies } from "next/headers";
import { fastapi } from "@/lib/fastapi";
import { SESSION_COOKIE } from "@/lib/session";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return errorResponse(401, "UNAUTHORIZED", "Please log in again");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, "BAD_REQUEST", "Send a photo or paste the receipt text");
  }

  const file = form.get("file");
  if (file instanceof File && file.size > MAX_IMAGE_BYTES) {
    return errorResponse(400, "BAD_REQUEST", "The photo must be 4 MB or smaller");
  }

  const result = await fastapi("/extract", {
    method: "POST",
    formData: form,
    token,
    headers: {
      "X-LLM-Provider": request.headers.get("X-LLM-Provider") ?? "",
      "X-LLM-Key": request.headers.get("X-LLM-Key") ?? "",
    },
  });

  if (result.status === 401) {
    cookieStore.delete(SESSION_COOKIE);
  }

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data);
}
