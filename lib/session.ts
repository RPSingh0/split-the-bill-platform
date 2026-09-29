import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fastapi } from "@/lib/fastapi";

export const SESSION_COOKIE = "stb_session";

export type User = {
  id: string;
  username: string;
};

export async function getToken() {
  const cookieStore = await cookies();

  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function requireUser() {
  const token = await getToken();
  if (!token) {
    redirect("/login");
  }

  const result = await fastapi<User>("/auth/me", { token });
  if (result.status === 401) {
    redirect("/login");
  }

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return { user: result.data, token };
}
