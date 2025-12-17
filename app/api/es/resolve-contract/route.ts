import { NextResponse } from "next/server";

const BASE = "https://api.massive.com";

function key() {
  const k = process.env.MASSIVE_API_KEY;
  if (!k) throw new Error("Missing MASSIVE_API_KEY in .env.local");
  return k;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const day = searchParams.get("day"); // YYYY-MM-DD
    const product = (searchParams.get("product_code") ?? "ES").toUpperCase();

    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    }

    // 1) Pull contracts list (Cole’s suggestion)
    const url =
      `${BASE}/futures/vX/contracts?` +
      new URLSearchParams({
        product_code: product,
        active: "all",
        type: "all",
        limit: "200",
        sort: "product_code.asc",
        apiKey: key(),
      }).toString();

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Massive contracts failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];

    // We don’t know exact field names in your response, so we return the raw list too.
    // But we TRY common ones: active_start / active_end / start_date / end_date
    const dayMs = Date.parse(day + "T00:00:00Z");

    const withRange = results
      .map((c) => {
        const start =
          c.active_start ?? c.start_date ?? c.first_trade_date ?? c.list_date ?? null;
        const end =
          c.active_end ?? c.end_date ?? c.last_trade_date ?? c.expiration_date ?? null;
        const startMs = start ? Date.parse(String(start)) : null;
        const endMs = end ? Date.parse(String(end)) : null;
        return { c, startMs, endMs };
      })
      .filter((x) => x.c?.ticker || x.c?.symbol || x.c?.contract_ticker);

    // pick “best” contract covering day if possible
    const covering = withRange.filter(
      (x) =>
        x.c?.type === "single" &&
        x.startMs != null &&
        x.endMs != null &&
        x.startMs <= dayMs &&
        dayMs <= x.endMs
    );

    const pick = (arr: any[]) => {
      const copy = [...arr];
      copy.sort((a, b) => (b.startMs ?? 0) - (a.startMs ?? 0));
      return copy[0]?.c ?? null;
    };

    const isSingle = (x: any) => x?.c?.type === "single";

    // Real ES contract tickers: ES + [F,G,H,J,K,M,N,Q,U,V,X,Z] + [0-9]
    const isRealContractTicker = (t: any) =>
      typeof t === "string" && /^ES[FGHJKMNQUVXZ]\d$/i.test(t);

    // Exclude synthetic/root instruments like ESH0, ESM0, ESZ0, etc.
    const isSynthetic0 = (t: any) =>
      typeof t === "string" && /^ES[FGHJKMNQUVXZ]0$/i.test(t);

    const onlyGoodSingles = (arr: any[]) =>
      arr
        .filter(isSingle)
        .filter((x) => isRealContractTicker(x.c?.ticker))
        .filter((x) => !isSynthetic0(x.c?.ticker));

    // Prefer: covering the day + good single contract ticker
    const chosen =
      pick(onlyGoodSingles(covering)) ??
      // Fallback: any good single contract ticker
      pick(onlyGoodSingles(withRange)) ??
      null;

    return NextResponse.json({
      ok: true,
      day,
      product_code: product,
      chosen,
      sample: results.slice(0, 5),
      total: results.length,
    });
  } catch (err: any) {
    console.error("[/api/es/resolve-contract] error:", err?.message ?? err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
