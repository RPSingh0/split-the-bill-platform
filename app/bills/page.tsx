import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { fastapi } from "@/lib/fastapi";
import { formatPaise } from "@/lib/money";
import { requireUser } from "@/lib/session";
import type { BillSummary } from "@/lib/types";

function peopleLabel(count: number) {
  if (count === 1) {
    return "1 person";
  }

  return `${count} people`;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-16 text-center">
      <h2 className="text-lg font-semibold">No bills yet</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        Upload a photo of a receipt or paste its text, then share the link with your friends.
      </p>
      <Link href="/bills/new" className={buttonVariants({ className: "mt-4 h-10 px-4" })}>
        New bill
      </Link>
    </div>
  );
}

function BillList({ bills }: { bills: BillSummary[] }) {
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
      {bills.map((bill) => (
        <li key={bill.slug}>
          <Link
            href={`/b/${bill.slug}`}
            className="flex items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{bill.merchant ?? "Untitled bill"}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(bill.bill_date ?? bill.created_at)} · {peopleLabel(bill.participant_count)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="font-medium tabular-nums">{formatPaise(bill.grand_total_paise)}</p>
              <StatusBadge status={bill.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function BillsPage() {
  const { user, token } = await requireUser();

  const result = await fastapi<BillSummary[]>("/bills", { token });
  if (result.status === 401) {
    redirect("/login");
  }

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  const bills = result.data;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">My bills</h1>
          <p className="truncate text-sm text-muted-foreground">Signed in as {user.username}</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={logout}>
            <Button type="submit" variant="ghost" className="h-10 px-3">
              Log out
            </Button>
          </form>
          {bills.length > 0 && (
            <Link href="/bills/new" className={buttonVariants({ className: "h-10 px-4" })}>
              New bill
            </Link>
          )}
        </div>
      </header>

      {bills.length === 0 && <EmptyState />}
      {bills.length > 0 && <BillList bills={bills} />}
    </main>
  );
}
