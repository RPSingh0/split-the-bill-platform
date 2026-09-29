import { ChevronDownIcon } from "lucide-react";
import { formatPaise } from "@/lib/money";
import type { OpenBill, SplitRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function breakdownLines(row: SplitRow) {
  const lines = [
    { label: "Tax", amount: row.tax_paise },
    { label: "Service charge", amount: row.service_charge_paise },
    { label: "Discount", amount: row.discount_paise },
    { label: "Round off", amount: row.round_off_paise },
    { label: "Other charges", amount: row.other_paise },
    { label: "Tip", amount: row.tip_paise },
  ];

  const shown = [];
  for (const line of lines) {
    if (line.amount !== 0) {
      shown.push(line);
    }
  }

  return shown;
}

function itemLines(row: SplitRow, itemNames: Record<string, string>) {
  const shown = [];
  for (const share of row.items) {
    if (share.amount_paise !== 0) {
      shown.push({ label: itemNames[share.item_id] ?? "Item", amount: share.amount_paise });
    }
  }

  return shown;
}

type RowProps = {
  row: SplitRow;
  title: string;
  note: string | null;
  isMe: boolean;
  itemNames: Record<string, string>;
};

function SummaryRow({ row, title, note, isMe, itemNames }: RowProps) {
  const items = itemLines(row, itemNames);
  const charges = breakdownLines(row);

  return (
    <li>
      <details className={cn("group", isMe && "bg-muted/50")}>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {title}
              {isMe && <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-xs text-background">You</span>}
            </p>
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
          </div>
          <span className="font-semibold tabular-nums">{formatPaise(row.total_paise)}</span>
          <ChevronDownIcon
            aria-hidden
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>

        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 pb-3 text-sm">
          {items.length === 0 && <dt className="text-muted-foreground">Nothing claimed</dt>}
          {items.map((line, index) => (
            <div key={`item-${index}`} className="contents">
              <dt className="truncate">{line.label}</dt>
              <dd className="text-right tabular-nums">{formatPaise(line.amount)}</dd>
            </div>
          ))}
          {charges.map((line) => (
            <div key={line.label} className="contents text-muted-foreground">
              <dt>{line.label}</dt>
              <dd className="text-right tabular-nums">{formatPaise(line.amount)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </li>
  );
}

export function BillSummary({ bill }: { bill: OpenBill }) {
  const itemNames: Record<string, string> = {};
  for (const item of bill.items) {
    itemNames[item.id] = item.name;
  }

  const hostNames: Record<string, boolean> = {};
  for (const participant of bill.participants) {
    hostNames[participant.id] = participant.is_host;
  }

  const unclaimed = bill.split.unclaimed;
  let unclaimedNote = "Everything is claimed";
  if (unclaimed.total_paise !== 0) {
    unclaimedNote = "Not claimed yet";
  }

  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="summary-heading" className="text-lg font-semibold">
          Who owes what
        </h2>
        <p className="text-xs text-muted-foreground">Tap a name for details</p>
      </div>

      <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {bill.split.rows.map((row) => (
          <SummaryRow
            key={row.participant_id}
            row={row}
            title={row.display_name}
            note={row.participant_id !== null && hostNames[row.participant_id] ? "Host" : null}
            isMe={row.participant_id === bill.me.participant_id}
            itemNames={itemNames}
          />
        ))}
        {bill.status === "open" && (
          <SummaryRow row={unclaimed} title="Unclaimed" note={unclaimedNote} isMe={false} itemNames={itemNames} />
        )}
      </ul>

      <p className="flex items-baseline justify-between px-4 text-sm">
        <span className="text-muted-foreground">Bill total</span>
        <span className="font-semibold tabular-nums">{formatPaise(bill.split.grand_total_paise)}</span>
      </p>
    </section>
  );
}
