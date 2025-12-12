import Link from "next/link";
import LivePrice from "@/components/spx/LivePrice";

export default function Page() {
  return (
    <div className="min-h-screen flex bg-[#020617] text-zinc-100">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-zinc-800 bg-black/40">
        <div className="px-4 py-5 text-lg font-semibold tracking-wide">
          <span className="text-zinc-400">SPX</span>{" "}
          <span className="text-emerald-400">SPICE</span>
        </div>

        <nav className="flex-1 px-2 space-y-1 text-sm">
          <Link
            href="/"
            className="block rounded-xl px-3 py-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
          >
            Algo
          </Link>
          <Link
            href="/broker"
            className="block rounded-xl px-3 py-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            Broker
          </Link>
          <Link
            href="/journal"
            className="block rounded-xl px-3 py-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            Journal
          </Link>
          <Link
            href="/news"
            className="block rounded-xl px-3 py-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            News
          </Link>
          <Link
            href="/spx"
            className="block rounded-xl px-3 py-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            SPX View
          </Link>
        </nav>

        <div className="px-4 py-4 text-[10px] text-zinc-500 border-t border-zinc-800">
          v0.1 • dev build
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">
              SPICE Algo Dashboard
            </h1>
            <p className="text-sm text-zinc-400">
              Live SPX engine with slots ready for multi-timeframe, entries,
              exits, flow, and TJR.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            LIVE
          </div>
        </header>

        {/* Top row: Live price + status */}
        <section className="grid md:grid-cols-[2fr,1.1fr] gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <LivePrice />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-2 text-sm">
            <h2 className="text-xs font-semibold text-zinc-300">
              Algo Status
            </h2>
            <p className="text-zinc-400">
              Engines wired:{" "}
              <span className="text-emerald-400 font-medium">
                LivePrice
              </span>
              . Next up: multi-timeframe trend, entry/exit logic, and flow
              integration.
            </p>
          </div>
        </section>

        {/* Bottom grid: placeholders for future engines */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
          <h2 className="text-xs font-semibold text-zinc-300 mb-2">
            Flow Engine (Serious)
          </h2>
          <p>
            Unusual options flow (e.g. Unusual Whales) as a dedicated signal input
            for SPICE. It can be toggled on/off, but when it&apos;s on, it&apos;s
            treated as a real part of the model — not a joke.
          </p>
          <p className="mt-2 text-[11px] text-zinc-500">
            The <span className="italic">TJR Panel</span> will live elsewhere as
            a fun commentary overlay only and will never affect SPICE&apos;s
            trading decisions.
          </p>
        </div>
      </main>
    </div>
  );
}
