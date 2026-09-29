"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { BillBody } from "@/lib/draft";
import { fastapi } from "@/lib/fastapi";
import { getToken, SESSION_COOKIE } from "@/lib/session";
import type { Issue } from "@/lib/types";

export type CreateBillResult = {
  slug: string | null;
  issues: Issue[];
  error: string | null;
};

export async function createBill(body: BillBody): Promise<CreateBillResult> {
  const token = await getToken();
  if (!token) {
    redirect("/login?next=/bills/new");
  }

  const result = await fastapi<{ slug: string }>("/bills", { method: "POST", body, token });

  if (result.status === 401) {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    redirect("/login?next=/bills/new");
  }

  if (!result.ok && result.status === 422) {
    return { slug: null, issues: result.error.issues as Issue[], error: null };
  }

  if (!result.ok) {
    return { slug: null, issues: [], error: result.error.message };
  }

  return { slug: result.data.slug, issues: [], error: null };
}
