// app/api/polygon/spx/route.ts
import { NextResponse } from "next/server";
import { fetchPolygon } from "@/lib/providers/polygon";

export async function GET() {
  try {
    // Ticker: SPX = Index
    const quote = await fetchPolygon("/v2/last/nbbo/I:SPX");

    return NextResponse.json({
      symbol: "SPX",
      bid: quote?.bidprice,
      ask: quote?.askprice,
      last: quote?.last?.price ?? null,
      timestamp: quote?.last?.timestamp ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
