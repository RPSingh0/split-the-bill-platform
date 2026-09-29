export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Split the Bill</h1>
        <p className="mt-2 text-sm text-muted-foreground">Snap the receipt. Share a link. Everyone pays for what they had.</p>
      </div>
      {children}
    </main>
  );
}
