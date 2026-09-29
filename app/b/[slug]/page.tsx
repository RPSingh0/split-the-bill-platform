import Link from "next/link";
import { notFound } from "next/navigation";
import { BillPage } from "@/components/bill-page";
import { NameScreen } from "@/components/name-screen";
import { fastapi } from "@/lib/fastapi";
import { getParticipantId, getToken } from "@/lib/session";
import type { BillResponse } from "@/lib/types";

function CancelledNotice({ hostName, loggedIn }: { hostName: string; loggedIn: boolean }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">This bill was cancelled</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hostName} cancelled this bill, so there&apos;s nothing to pay here.
      </p>
      {loggedIn && (
        <Link href="/bills" className="text-sm font-medium underline-offset-4 hover:underline">
          Back to my bills
        </Link>
      )}
    </main>
  );
}

export default async function BillRoute({ params }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const token = await getToken();
  const participantId = await getParticipantId(slug);

  if (!token && !participantId) {
    return <NameScreen slug={slug} removed={false} />;
  }

  const result = await fastapi<BillResponse>(`/bills/${encodeURIComponent(slug)}`, { token, participantId });

  if (result.status === 404) {
    notFound();
  }

  if (result.status === 403) {
    return <NameScreen slug={slug} removed={participantId !== undefined} />;
  }

  if (!result.ok || !result.data.changed) {
    throw new Error("Could not load the bill");
  }

  const bill = result.data.bill;
  if (bill.status === "cancelled") {
    return <CancelledNotice hostName={bill.host_name} loggedIn={token !== undefined} />;
  }

  return <BillPage bill={bill} />;
}
