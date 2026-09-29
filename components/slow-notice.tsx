"use client";

import { useEffect, useState } from "react";

export function SlowNotice() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!slow) {
    return null;
  }

  return (
    <p role="status" className="text-center text-sm text-muted-foreground">
      Waking up the server — the first request can take up to a minute.
    </p>
  );
}
