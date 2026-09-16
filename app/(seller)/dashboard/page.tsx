export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Processed assets, tags, variants, and export will show up here once the core pipeline
        (Sep 19-22) is wired up.
      </p>
    </main>
  );
}
