"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { joinBill, type JoinState } from "@/app/actions/participants";
import { SlowNotice } from "@/components/slow-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  slug: string;
  removed: boolean;
};

const initialState: JoinState = { error: null, existingName: null };

export function NameScreen({ slug, removed }: Props) {
  const [state, formAction, pending] = useActionState(joinBill.bind(null, slug), initialState);
  const [name, setName] = useState("");
  const [answeredNo, setAnsweredNo] = useState(false);

  function someoneElse(existingName: string) {
    setAnsweredNo(true);
    setName(`${existingName} `);
  }

  const askIfSame = state.existingName !== null && !answeredNo;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Split the Bill</h1>
        <p className="mt-2 text-sm text-muted-foreground">Claim what you had. Everyone pays exactly their share.</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">You&apos;ve been invited to split a bill</CardTitle>
          <CardDescription>Enter your name so everyone knows what you had.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {removed && (
            <p role="status" className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              You&apos;re no longer on this bill. The host may have removed you. Join again with your name.
            </p>
          )}

          {askIfSame && (
            <div className="flex flex-col gap-3 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">{state.existingName} is already on this bill. Is that you?</p>
              <div className="flex gap-2">
                <form action={formAction} onSubmit={() => setAnsweredNo(false)}>
                  <input type="hidden" name="name" value={state.existingName ?? ""} />
                  <input type="hidden" name="confirm" value="true" />
                  <Button type="submit" className="h-10" disabled={pending}>
                    Yes, that&apos;s me
                  </Button>
                </form>
                <Button
                  variant="outline"
                  className="h-10"
                  disabled={pending}
                  onClick={() => someoneElse(state.existingName ?? "")}
                >
                  No, I&apos;m someone else
                </Button>
              </div>
            </div>
          )}

          {!askIfSame && (
            <form action={formAction} onSubmit={() => setAnsweredNo(false)} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  name="name"
                  className="h-10"
                  autoComplete="given-name"
                  maxLength={30}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                {answeredNo && (
                  <p className="text-xs text-muted-foreground">
                    Add something to tell you apart, like {state.existingName} S.
                  </p>
                )}
              </div>

              {state.error && (
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
              )}

              <Button type="submit" className="h-10" disabled={pending}>
                {pending ? "Joining…" : "Join bill"}
              </Button>
            </form>
          )}

          {pending && <SlowNotice />}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Hosting this bill?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
