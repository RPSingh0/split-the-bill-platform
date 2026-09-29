import Link from "next/link";
import { notMe } from "@/app/actions/participants";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import type { OpenBill } from "@/lib/types";

function myName(bill: OpenBill) {
  for (const participant of bill.participants) {
    if (participant.id === bill.me.participant_id) {
      return participant.display_name;
    }
  }

  return "";
}

export function BillPage({ bill }: { bill: OpenBill }) {
  let subtitle = `Hosted by ${bill.host_name}`;
  if (bill.bill_date) {
    subtitle = `${formatDate(bill.bill_date)} · ${subtitle}`;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        {bill.me.is_host && (
          <Link href="/bills" className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            ← My bills
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 text-2xl font-semibold break-words">{bill.merchant ?? "Untitled bill"}</h1>
          <StatusBadge status={bill.status} />
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-4 py-3 text-sm">
        <p className="min-w-0 truncate">
          You&apos;re in as <span className="font-semibold">{myName(bill)}</span>
          {bill.me.is_host && <span className="text-muted-foreground"> (host)</span>}
        </p>
        {!bill.me.is_host && (
          <form action={notMe.bind(null, bill.slug)}>
            <Button type="submit" variant="link" className="h-auto px-0">
              Not you?
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-semibold">People · {bill.participants.length} of 10</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {bill.participants.map((participant) => (
              <li key={participant.id} className="flex items-center justify-between gap-4">
                <span className="truncate">{participant.display_name}</span>
                {participant.is_host && <span className="text-muted-foreground">Host</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Bill total</span>
        <span className="text-lg font-semibold tabular-nums">{formatPaise(bill.grand_total_paise)}</span>
      </p>
    </main>
  );
}
