import { notFound } from "next/navigation";
import { BillPage } from "@/components/bill-page";
import { CancelledNotice } from "@/components/cancelled-notice";
import { NameScreen } from "@/components/name-screen";
import { fastapi } from "@/lib/fastapi";
import { getParticipantId, getToken } from "@/lib/session";
import type { BillResponse } from "@/lib/types";

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
    return <CancelledNotice hostName={bill.host_name} showBillsLink={token !== undefined} />;
  }

  return <BillPage initialBill={bill} />;
}
