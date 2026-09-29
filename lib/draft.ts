import { z } from "zod";
import { paiseToRupees, parseDecimal, percentOfPaise, rupeesToPaise } from "@/lib/money";
import type { Receipt } from "@/lib/types";

const DRAFT_STORAGE_KEY = "stb:draft";

const issueSchema = z.object({
  code: z.string(),
  severity: z.enum(["error", "warning"]),
  field: z.string(),
  message: z.string(),
  expected: z.number().nullable(),
  actual: z.number().nullable(),
});

const draftSchema = z.object({
  merchant: z.string(),
  billDate: z.string(),
  currency: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      unitPrice: z.string(),
      lineTotal: z.string(),
    }),
  ),
  charges: z.array(
    z.object({
      label: z.string(),
      kind: z.enum(["tax", "service_charge", "discount", "round_off", "other"]),
      rate: z.string(),
      amount: z.string(),
    }),
  ),
  subtotal: z.string(),
  total: z.string(),
  tipMode: z.enum(["percent", "amount"]),
  tip: z.string(),
  serverIssues: z.array(issueSchema),
});

export type Draft = z.infer<typeof draftSchema>;
export type DraftItem = Draft["items"][number];
export type DraftCharge = Draft["charges"][number];
export type BillBody = ReturnType<typeof toBillBody>;

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function loadDraft() {
  const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
  if (!saved) {
    return null;
  }

  const parsed = draftSchema.safeParse(parseJson(saved));
  if (!parsed.success) {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }

  return parsed.data;
}

export function saveDraft(draft: Draft) {
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

function numberText(value: number | null) {
  if (value === null) {
    return "";
  }

  return String(value);
}

export function draftFromReceipt(receipt: Receipt): Draft {
  const items: DraftItem[] = [];
  for (const item of receipt.items) {
    items.push({
      name: item.name ?? "",
      quantity: numberText(item.quantity),
      unitPrice: paiseToRupees(item.unit_price_paise),
      lineTotal: paiseToRupees(item.line_total_paise),
    });
  }

  const charges: DraftCharge[] = [];
  for (const charge of receipt.charges) {
    charges.push({
      label: charge.label ?? "",
      kind: charge.kind,
      rate: numberText(charge.rate_percent),
      amount: paiseToRupees(charge.amount_paise),
    });
  }

  let tipMode: Draft["tipMode"] = "percent";
  let tip = "";
  if (receipt.suggested_tip_paise > 0) {
    tipMode = "amount";
    tip = paiseToRupees(receipt.suggested_tip_paise);
  }

  return {
    merchant: receipt.merchant ?? "",
    billDate: receipt.bill_date ?? "",
    currency: receipt.currency,
    items,
    charges,
    subtotal: paiseToRupees(receipt.subtotal_paise),
    total: paiseToRupees(receipt.total_paise),
    tipMode,
    tip,
    serverIssues: [],
  };
}

export function tipPaise(draft: Draft) {
  if (draft.tip.trim() === "") {
    return 0;
  }

  if (draft.tipMode === "amount") {
    return rupeesToPaise(draft.tip);
  }

  const percent = parseDecimal(draft.tip, 3);
  if (percent === null) {
    return null;
  }

  let itemsSum = 0;
  for (const item of draft.items) {
    const lineTotal = rupeesToPaise(item.lineTotal);
    if (lineTotal === null) {
      return null;
    }
    itemsSum += lineTotal;
  }

  return percentOfPaise(itemsSum, percent);
}

function numberOrNull(text: string, places: number) {
  if (parseDecimal(text, places) === null) {
    return null;
  }

  return Number(text.trim().replace(/,/g, ""));
}

function textOrNull(text: string) {
  if (text.trim() === "") {
    return null;
  }

  return text.trim();
}

export function toBillBody(draft: Draft) {
  const items = [];
  for (const item of draft.items) {
    items.push({
      name: item.name.trim(),
      quantity: numberOrNull(item.quantity, 3),
      unit_price_paise: rupeesToPaise(item.unitPrice),
      line_total_paise: rupeesToPaise(item.lineTotal),
    });
  }

  const charges = [];
  for (const charge of draft.charges) {
    charges.push({
      label: charge.label.trim(),
      kind: charge.kind,
      rate_percent: numberOrNull(charge.rate, 3),
      amount_paise: rupeesToPaise(charge.amount),
    });
  }

  let tipPercent: number | null = null;
  if (draft.tipMode === "percent") {
    tipPercent = numberOrNull(draft.tip, 3);
  }

  return {
    merchant: textOrNull(draft.merchant),
    bill_date: textOrNull(draft.billDate),
    currency: draft.currency,
    items,
    charges,
    subtotal_paise: rupeesToPaise(draft.subtotal),
    total_paise: rupeesToPaise(draft.total),
    tip_paise: tipPaise(draft) ?? 0,
    tip_percent: tipPercent,
  };
}
