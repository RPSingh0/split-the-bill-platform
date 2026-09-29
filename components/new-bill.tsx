"use client";

import { useState } from "react";
import { ReceiptStep } from "@/components/receipt-step";
import { ReviewForm } from "@/components/review-form";
import { clearDraft, draftFromReceipt, loadDraft, saveDraft } from "@/lib/draft";
import type { ExtractResponse } from "@/lib/types";
import { keepServerOnly, validateDraft } from "@/lib/validate";

export function NewBill() {
  const [draft, setDraft] = useState(loadDraft);

  function handleExtracted(result: ExtractResponse) {
    const next = draftFromReceipt(result.receipt);
    next.serverIssues = keepServerOnly(result.issues, validateDraft(next));
    saveDraft(next);
    setDraft(next);
  }

  function startOver() {
    clearDraft();
    setDraft(null);
  }

  if (!draft) {
    return <ReceiptStep onExtracted={handleExtracted} />;
  }

  return <ReviewForm initialDraft={draft} onStartOver={startOver} />;
}
