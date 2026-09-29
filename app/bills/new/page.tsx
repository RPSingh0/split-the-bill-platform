import Link from "next/link";
import { NewBillLoader } from "@/components/new-bill-loader";
import { requireUser } from "@/lib/session";

export default async function NewBillPage() {
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <Link href="/bills" className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          ← My bills
        </Link>
        <h1 className="text-2xl font-semibold">New bill</h1>
      </header>
      <NewBillLoader />
    </main>
  );
}
