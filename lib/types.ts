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

export type BillItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price_paise: number | null;
  line_total_paise: number;
  claim_mode: "shared" | "units";
  max_units: number | null;
  units_claimed: number;
  claims: { participant_id: string; units: number }[];
};

export type BillCharge = {
  label: string;
  kind: ChargeKind;
  rate_percent: number | null;
  amount_paise: number;
};

export type Participant = {
  id: string;
  display_name: string;
  is_host: boolean;
  joined_at: string;
};

export type SplitRow = {
  participant_id: string | null;
  display_name: string;
  items: { item_id: string; amount_paise: number }[];
  item_subtotal_paise: number;
  tax_paise: number;
  service_charge_paise: number;
  discount_paise: number;
  round_off_paise: number;
  other_paise: number;
  tip_paise: number;
  total_paise: number;
};

export type OpenBill = {
  slug: string;
  status: "open" | "done";
  version: number;
  merchant: string | null;
  bill_date: string | null;
  currency: string;
  host_name: string;
  items: BillItem[];
  charges: BillCharge[];
  subtotal_paise: number;
  total_paise: number;
  tip_paise: number;
  tip_percent: number | null;
  grand_total_paise: number;
  participants: Participant[];
  split: { rows: SplitRow[]; unclaimed: SplitRow; grand_total_paise: number };
  me: { participant_id: string; is_host: boolean };
};

export type CancelledBill = {
  slug: string;
  status: "cancelled";
  version: number;
  host_name: string;
};

export type BillView = OpenBill | CancelledBill;

export type BillResponse = { changed: true; bill: BillView } | { changed: false; version: number };
