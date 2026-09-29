"use client";

import { CopyIcon, Share2Icon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { notMe } from "@/app/actions/participants";
import { BillItems } from "@/components/bill-items";
import { BillSummary } from "@/components/bill-summary";
import { CancelledNotice } from "@/components/cancelled-notice";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/messages";
import { formatPaise } from "@/lib/money";
import type { ApiError, BillItem, BillView, OpenBill } from "@/lib/types";

class RequestError extends Error {
  status: number;
  error: ApiError;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.status = status;
    this.error = error;
  }
}

async function readJson(response: Response) {
  const json = await response.json();
  if (!response.ok) {
    throw new RequestError(response.status, json.error);
  }

  return json;
}

async function sendClaim(slug: string, itemId: string, units: number): Promise<BillView> {
  const url = `/api/bills/${encodeURIComponent(slug)}/claims/${itemId}`;

  if (units === 0) {
    return readJson(await fetch(url, { method: "DELETE" }));
  }

  return readJson(
    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units }),
    }),
  );
}

function withMyClaim(bill: BillView, itemId: string, units: number): BillView {
  if (bill.status === "cancelled") {
    return bill;
  }

  const me = bill.me.participant_id;
  const items = [];
  for (const item of bill.items) {
    if (item.id !== itemId) {
      items.push(item);
      continue;
    }

    const claims = [];
    let unitsClaimed = 0;
    for (const claim of item.claims) {
      if (claim.participant_id !== me) {
        claims.push(claim);
        unitsClaimed += claim.units;
      }
    }

    if (units > 0) {
      claims.push({ participant_id: me, units });
      unitsClaimed += units;
    }

    items.push({ ...item, claims, units_claimed: unitsClaimed });
  }

  return { ...bill, items };
}

function myName(bill: OpenBill) {
  for (const participant of bill.participants) {
    if (participant.id === bill.me.participant_id) {
      return participant.display_name;
    }
  }

  return "";
}

function myTotal(bill: OpenBill) {
  for (const row of bill.split.rows) {
    if (row.participant_id === bill.me.participant_id) {
      return row.total_paise;
    }
  }

  return 0;
}

export function BillPage({ initialBill }: { initialBill: OpenBill }) {
  const { cache } = useSWRConfig();
  const key = `/api/bills/${encodeURIComponent(initialBill.slug)}`;

  async function fetchBill(url: string): Promise<BillView> {
    const current = cache.get(url)?.data as BillView | undefined;

    let requestUrl = url;
    if (current) {
      requestUrl = `${url}?since=${current.version}`;
    }

    const json = await readJson(await fetch(requestUrl));
    if (!json.changed) {
      return current as BillView;
    }

    return json.bill;
  }

  function pollInterval(latest: BillView | undefined) {
    let status: BillView["status"] = initialBill.status;
    if (latest) {
      status = latest.status;
    }

    if (status === "open") {
      return 3000;
    }

    return 0;
  }

  function leaveIfRemoved(error: unknown) {
    if (error instanceof RequestError && error.status === 403) {
      toast.error("You're no longer on this bill.");
      notMe(initialBill.slug);
      return true;
    }

    return false;
  }

  const { data, mutate } = useSWR<BillView>(key, fetchBill, {
    fallbackData: initialBill,
    refreshInterval: pollInterval,
    onError: leaveIfRemoved,
  });

  const bill = data ?? initialBill;

  async function claim(item: BillItem, units: number) {
    try {
      await mutate(sendClaim(initialBill.slug, item.id, units), {
        optimisticData: (current, displayed) => withMyClaim(current ?? displayed ?? initialBill, item.id, units),
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      });
    } catch (error) {
      if (leaveIfRemoved(error)) {
        return;
      }

      if (error instanceof RequestError) {
        toast.error(errorMessage(error.error));
      } else {
        toast.error("Couldn't save that. Please try again.");
      }
      mutate();
    }
  }

  function shareUrl() {
    return `${window.location.origin}/b/${bill.slug}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy. Copy the address from your browser instead.");
    }
  }

  async function shareLink() {
    if (typeof navigator.share !== "function") {
      copyLink();
      return;
    }

    try {
      await navigator.share({ title: "Split the bill", text: "Claim what you had on this bill.", url: shareUrl() });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      copyLink();
    }
  }

  if (bill.status === "cancelled") {
    return <CancelledNotice hostName={bill.host_name} showBillsLink={initialBill.me.is_host} />;
  }

  const isOpen = bill.status === "open";
  let subtitle = `Hosted by ${bill.host_name}`;
  if (bill.bill_date) {
    subtitle = `${formatDate(bill.bill_date)} · ${subtitle}`;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-8">
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

      {bill.me.is_host && isOpen && (
        <section className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10">
          <div>
            <h2 className="font-semibold">Share with your friends</h2>
            <p className="text-sm text-muted-foreground">Anyone with the link can join and claim what they had.</p>
          </div>
          <div className="flex gap-2">
            <Button className="h-10 flex-1" onClick={copyLink}>
              <CopyIcon aria-hidden />
              Copy link
            </Button>
            <Button variant="outline" className="h-10 flex-1" onClick={shareLink}>
              <Share2Icon aria-hidden />
              Share…
            </Button>
          </div>
        </section>
      )}

      {!isOpen && (
        <p className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Settled. This is the final split.
        </p>
      )}

      <BillItems bill={bill} readOnly={!isOpen} onClaim={claim} />
      <BillSummary bill={bill} />

      <div className="sticky bottom-0 -mx-4 mt-auto border-t bg-background/75 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl reduce-transparency:bg-background reduce-transparency:backdrop-blur-none">
        <p className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">You owe</span>
          <span className="text-2xl font-semibold tabular-nums">{formatPaise(myTotal(bill))}</span>
        </p>
      </div>
    </main>
  );
}
