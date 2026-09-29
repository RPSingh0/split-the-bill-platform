"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fastapi } from "@/lib/fastapi";
import { SESSION_COOKIE, type User } from "@/lib/session";

export type AuthState = {
  username: string;
  error: string | null;
};

const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, "Username must be 3 to 30 letters, numbers or underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

function readForm(formData: FormData) {
  return {
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? ""),
  };
}

function safeNext(next: string) {
  if (next === "/bills/new") {
    return next;
  }

  return "/bills";
}

async function authenticate(path: string, username: string, password: string, next: string): Promise<AuthState> {
  const result = await fastapi<{ user: User; token: string }>(path, {
    method: "POST",
    body: { username, password },
  });

  if (!result.ok) {
    return { username, error: result.error.message };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, result.data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: WEEK_IN_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });

  redirect(safeNext(next));
}

export async function signup(state: AuthState, formData: FormData): Promise<AuthState> {
  const form = readForm(formData);

  const parsed = signupSchema.safeParse(form);
  if (!parsed.success) {
    return { username: form.username, error: parsed.error.issues[0].message };
  }

  return authenticate("/auth/signup", parsed.data.username, parsed.data.password, form.next);
}

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const form = readForm(formData);

  const parsed = loginSchema.safeParse(form);
  if (!parsed.success) {
    return { username: form.username, error: parsed.error.issues[0].message };
  }

  return authenticate("/auth/login", parsed.data.username, parsed.data.password, form.next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  redirect("/login");
}
