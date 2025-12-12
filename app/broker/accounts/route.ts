// app/api/broker/accounts/route.ts
import { NextResponse } from "next/server";
import type { BrokerAccount } from "@/lib/broker/brokerTypes";

export async function GET() {
  // TODO: Call real broker API to list brokerage accounts for the owner.
  const accounts: BrokerAccount[] = [];

  return NextResponse.json({
    ok: true,
    accounts,
    note: "TODO: Replace with real broker account list from aggregator.",
  });
}
