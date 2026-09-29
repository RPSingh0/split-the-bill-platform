"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "@/app/actions/auth";
import { SlowNotice } from "@/components/slow-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  mode: "login" | "signup";
  next: string;
};

const initialState: AuthState = { username: "", error: null };

export function AuthForm({ mode, next }: Props) {
  const isLogin = mode === "login";
  const [state, formAction, pending] = useActionState(isLogin ? login : signup, initialState);

  let submitLabel = isLogin ? "Log in" : "Create account";
  if (pending) {
    submitLabel = isLogin ? "Logging in…" : "Creating account…";
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{isLogin ? "Welcome back" : "Create your account"}</CardTitle>
        <CardDescription>
          {isLogin ? "Log in to host a bill." : "You need an account to host a bill. Friends just need the link."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="next" value={next} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              className="h-10"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              defaultValue={state.username}
            />
            {!isLogin && <p className="text-xs text-muted-foreground">3 to 30 letters, numbers or underscores.</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              className="h-10"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
            {!isLogin && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <Button type="submit" className="h-10" disabled={pending}>
            {submitLabel}
          </Button>

          {pending && <SlowNotice />}
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link href={isLogin ? "/signup" : "/login"} className="font-medium text-foreground underline-offset-4 hover:underline">
            {isLogin ? "Create an account" : "Log in"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
