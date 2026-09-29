export default function BillNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">This bill link doesn&apos;t exist</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Check the link with whoever shared it. It may have a typo or be missing a few characters.
      </p>
    </main>
  );
}
