// app/api/broker/options/route.ts
import { NextResponse } from "next/server";
import type { OptionPosition } from "@/lib/broker/brokerTypes";

export async function GET() {
  // TODO: Call broker API for option positions, filter to SPX/SPY, normalize.
  const positions: OptionPosition[] = [];

  return NextResponse.json({
    ok: true,
    positions,
    note: "TODO: Replace with real option positions from aggregator.",
  });
}
