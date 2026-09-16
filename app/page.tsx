import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-3xl font-semibold">Ethnic Studio</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          One flat garment photo in, a complete marketplace listing out.
        </p>
      </div>
      <nav className="flex gap-4 text-sm font-medium">
        <Link href="/upload" className="underline underline-offset-2">
          Upload
        </Link>
        <Link href="/dashboard" className="underline underline-offset-2">
          Dashboard
        </Link>
        <Link href="/catalog" className="underline underline-offset-2">
          Catalog
        </Link>
      </nav>
    </main>
  );
}
