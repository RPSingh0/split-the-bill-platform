import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/money";
import type { BillItem, OpenBill } from "@/lib/types";
import { cn } from "@/lib/utils";

type ClaimHandler = (item: BillItem, units: number) => void;

function participantNames(bill: OpenBill) {
  const names: Record<string, string> = {};
  for (const participant of bill.participants) {
    names[participant.id] = participant.display_name;
  }

  return names;
}

function myShares(bill: OpenBill) {
  const shares: Record<string, number> = {};
  for (const row of bill.split.rows) {
    if (row.participant_id !== bill.me.participant_id) {
      continue;
    }

    for (const share of row.items) {
      shares[share.item_id] = share.amount_paise;
    }
  }

  return shares;
}

function myUnits(item: BillItem, me: string) {
  for (const claim of item.claims) {
    if (claim.participant_id === me) {
      return claim.units;
    }
  }

  return 0;
}

function claimantText(item: BillItem, names: Record<string, string>, me: string) {
  const parts = [];
  for (const claim of item.claims) {
    let name = names[claim.participant_id] ?? "Someone";
    if (claim.participant_id === me) {
      name = "You";
    }

    if (item.claim_mode === "units") {
      name += ` ×${claim.units}`;
    }

    parts.push(name);
  }

  if (parts.length === 0) {
    return "No one yet";
  }

  return parts.join(", ");
}

function quantityText(item: BillItem) {
  if (item.unit_price_paise !== null) {
    return `${item.quantity} × ${formatPaise(item.unit_price_paise)}`;
  }

  if (item.quantity !== 1) {
    return `Qty ${item.quantity}`;
  }

  return "";
}

function ClaimControl({ item, mine, onClaim }: { item: BillItem; mine: number; onClaim: ClaimHandler }) {
  if (item.claim_mode === "shared") {
    return (
      <Button
        variant={mine > 0 ? "default" : "outline"}
        className="h-9 shrink-0 px-3"
        aria-pressed={mine > 0}
        onClick={() => onClaim(item, mine > 0 ? 0 : 1)}
      >
        {mine > 0 && <CheckIcon aria-hidden />}
        I had this
      </Button>
    );
  }

  const maxUnits = item.max_units ?? 0;
  const left = maxUnits - item.units_claimed;

  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className="text-xs text-muted-foreground tabular-nums">
        {left} of {maxUnits} left
      </span>
      <div className="flex items-center rounded-lg ring-1 ring-foreground/10">
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={`One less ${item.name}`}
          disabled={mine === 0}
          onClick={() => onClaim(item, mine - 1)}
        >
          <MinusIcon />
        </Button>
        <span aria-live="polite" className="w-6 text-center text-sm font-semibold tabular-nums">
          {mine}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={`One more ${item.name}`}
          disabled={left <= 0}
          onClick={() => onClaim(item, mine + 1)}
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}

type Props = {
  bill: OpenBill;
  readOnly: boolean;
  onClaim: ClaimHandler;
};

export function BillItems({ bill, readOnly, onClaim }: Props) {
  const names = participantNames(bill);
  const shares = myShares(bill);
  const me = bill.me.participant_id;

  return (
    <section aria-labelledby="items-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="items-heading" className="text-lg font-semibold">
          {readOnly ? "Items" : "What did you have?"}
        </h2>
        {!readOnly && <p className="text-xs text-muted-foreground">Updates live</p>}
      </div>

      <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {bill.items.map((item) => {
          const mine = myUnits(item, me);

          return (
            <li key={item.id} className={cn("flex flex-col gap-3 px-4 py-3 transition-colors", mine > 0 && "bg-success/5")}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium break-words">{item.name}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{quantityText(item)}</p>
                </div>
                <p className="font-medium tabular-nums">{formatPaise(item.line_total_paise)}</p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 text-sm">
                  <p className="truncate text-muted-foreground">{claimantText(item, names, me)}</p>
                  {mine > 0 && shares[item.id] !== undefined && (
                    <p className="text-success tabular-nums">Your share {formatPaise(shares[item.id])}</p>
                  )}
                </div>
                {!readOnly && <ClaimControl item={item} mine={mine} onClaim={onClaim} />}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
