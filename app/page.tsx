import Link from "next/link";

const NAV_ITEMS = [
  { href: "/upload", label: "Upload" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/catalog", label: "Catalog" },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-8 text-center animate-[fadeInUp_500ms_ease-out]">
      <div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">Ethnic Studio</h1>
        <p className="mx-auto mt-4 max-w-md text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
          One flat garment photo in, a complete marketplace listing out.
        </p>
      </div>

      <nav className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-black/10 bg-black px-8 py-10 text-white transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-indigo-600 hover:shadow-2xl active:translate-y-0 dark:border-white/10"
          >
            <span className="text-2xl font-semibold sm:text-3xl">{item.label}</span>
            <span className="text-lg text-white/50 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:text-white/90">
              →
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
