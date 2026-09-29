"use client";

import { useState } from "react";
import { ReceiptStep } from "@/components/receipt-step";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPaise } from "@/lib/money";
import type { ExtractResponse } from "@/lib/types";

export function NewBill() {
  const [extracted, setExtracted] = useState<ExtractResponse | null>(null);

  if (!extracted) {
    return <ReceiptStep onExtracted={setExtracted} />;
  }

  const receipt = extracted.receipt;
  let summary = `Found ${receipt.items.length} ${receipt.items.length === 1 ? "item" : "items"}`;
  if (receipt.total_paise !== null) {
    summary += ` · total ${formatPaise(receipt.total_paise)}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">{receipt.merchant ?? "Receipt read"}</CardTitle>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={() => setExtracted(null)}>
          Start over
        </Button>
      </CardContent>
    </Card>
  );
}
