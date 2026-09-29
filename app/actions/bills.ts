"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { BillBody } from "@/lib/draft";
import { fastapi } from "@/lib/fastapi";
import { errorMessage } from "@/lib/messages";
import { getToken, SESSION_COOKIE } from "@/lib/session";
import type { BillView, Issue } from "@/lib/types";

export type HostActionResult = {
  bill: BillView | null;
  error: string | null;
};

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

async function hostRequest(method: string, path: string): Promise<HostActionResult> {
  const token = await getToken();
  const result = await fastapi<BillView>(path, { method, token });

  if (!result.ok) {
    return { bill: null, error: errorMessage(result.error) };
  }

  return { bill: result.data, error: null };
}

export async function removeParticipant(slug: string, participantId: string) {
  return hostRequest("DELETE", `/bills/${encodeURIComponent(slug)}/participants/${encodeURIComponent(participantId)}`);
}

export async function markDone(slug: string) {
  return hostRequest("POST", `/bills/${encodeURIComponent(slug)}/done`);
}

export async function cancelBill(slug: string) {
  return hostRequest("POST", `/bills/${encodeURIComponent(slug)}/cancel`);
}
