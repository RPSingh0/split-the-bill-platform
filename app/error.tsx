"use client";

import { Button } from "@/components/ui/button";

export default function Error({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The server may still be waking up. Please try again in a moment.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
