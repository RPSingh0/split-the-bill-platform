import Link from "next/link";

type Props = {
  hostName: string;
  showBillsLink: boolean;
};

export function CancelledNotice({ hostName, showBillsLink }: Props) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">This bill was cancelled</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hostName} cancelled this bill, so there&apos;s nothing to pay here.
      </p>
      {showBillsLink && (
        <Link href="/bills" className="text-sm font-medium underline-offset-4 hover:underline">
          Back to my bills
        </Link>
      )}
    </main>
  );
}
