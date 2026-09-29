"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { fastapi } from "@/lib/fastapi";
import { errorMessage } from "@/lib/messages";
import { participantCookie } from "@/lib/session";

export type JoinState = {
  error: string | null;
  existingName: string | null;
};

const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export async function joinBill(slug: string, state: JoinState, formData: FormData): Promise<JoinState> {
  const name = String(formData.get("name") ?? "");
  const confirm = formData.get("confirm") === "true";

  const result = await fastapi<{ participant_id: string }>(`/bills/${encodeURIComponent(slug)}/join`, {
    method: "POST",
    body: { name, confirm },
  });

  if (!result.ok && result.error.code === "NAME_EXISTS") {
    const existingName = String(result.error.existing_name);
    if (result.error.can_confirm) {
      return { error: null, existingName };
    }

    return { error: `${existingName} is the host's name. Please use a different name.`, existingName: null };
  }

  if (!result.ok) {
    return { error: errorMessage(result.error), existingName: null };
  }

  const cookieStore = await cookies();
  cookieStore.set(participantCookie(slug), result.data.participant_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: YEAR_IN_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });

  refresh();

  return { error: null, existingName: null };
}

export async function notMe(slug: string) {
  const cookieStore = await cookies();
  cookieStore.delete(participantCookie(slug));

  refresh();
}
