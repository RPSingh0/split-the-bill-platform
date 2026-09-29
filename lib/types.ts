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
