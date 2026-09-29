export type ApiError = {
  code: string;
  message: string;
  [key: string]: unknown;
};

export type BillStatus = "open" | "done" | "cancelled";

export type BillSummary = {
  slug: string;
  merchant: string | null;
  bill_date: string | null;
  grand_total_paise: number;
  status: BillStatus;
  participant_count: number;
  created_at: string;
};

export type ChargeKind = "tax" | "service_charge" | "discount" | "round_off" | "other";

export type ReceiptItem = {
  name: string | null;
  quantity: number | null;
  unit_price_paise: number | null;
  line_total_paise: number | null;
};

export type ReceiptCharge = {
  label: string | null;
  kind: ChargeKind;
  rate_percent: number | null;
  amount_paise: number | null;
};

export type Receipt = {
  is_receipt: boolean;
  merchant: string | null;
  bill_date: string | null;
  currency: string;
  items: ReceiptItem[];
  subtotal_paise: number | null;
  charges: ReceiptCharge[];
  total_paise: number | null;
  suggested_tip_paise: number;
  warnings: string[];
};

export type Issue = {
  code: string;
  severity: "error" | "warning";
  field: string;
  message: string;
  expected: number | null;
  actual: number | null;
};

export type ExtractResponse = {
  receipt: Receipt;
  issues: Issue[];
};
