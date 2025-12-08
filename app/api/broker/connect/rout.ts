// app/api/broker/connect/route.ts
import { NextResponse } from "next/server";

const CLIENT_ID = process.env.BROKER_CLIENT_ID;
const OWNER_ID = process.env.SPICE_OWNER_ID ?? "spice-owner";

export async function GET() {
  if (!CLIENT_ID) {
    console.warn("[broker/connect] BROKER_CLIENT_ID not set");
  }

  // TODO: integrate with real broker aggregator (e.g., SnapTrade)
  // This should:
  // 1. Ensure a "user" exists in the broker system (using OWNER_ID)
  // 2. Ask the broker API for a "connection portal" URL
  // 3. Return that URL to the front-end

  const placeholderUrl =
    "https://example-broker-portal.com/connect?client_id=" +
    encodeURIComponent(CLIENT_ID ?? "missing-client");

  return NextResponse.json({
    ok: true,
    provider: "snaptrade",
    ownerId: OWNER_ID,
    connectUrl: placeholderUrl,
    note: "TODO: Replace placeholderUrl with real broker connection portal URL.",
  });
}
