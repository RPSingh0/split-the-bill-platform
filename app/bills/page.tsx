import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";

export default async function BillsPage() {
  const { user } = await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hi {user.username}</h1>
        <form action={logout}>
          <Button type="submit" variant="ghost">
            Log out
          </Button>
        </form>
      </div>
    </main>
  );
}
