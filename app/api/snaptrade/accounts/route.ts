// app/api/snaptrade/accounts/route.ts
import { NextResponse } from "next/server";
import { snaptrade } from "@/lib/snaptradeClient";

const USER_ID = process.env.SNAPTRADE_USER_ID!;
const USER_SECRET = process.env.SNAPTRADE_USER_SECRET!;

// Helper to remove circular references / non-serializable stuff
function stripCircular<T>(value: T): T {
  const seen = new WeakSet<object>();

  const json = JSON.stringify(value as any, (_key, val) => {
    if (val && typeof val === "object") {
      if (seen.has(val as object)) {
        // drop repeated / circular references
        return;
      }
      seen.add(val as object);
    }
    return val;
  });

  return JSON.parse(json);
}

export async function GET() {
  try {
    const raw = await snaptrade.accountInformation.listUserAccounts({
      userId: USER_ID,
      userSecret: USER_SECRET,
    });

    // Some SDKs return { data, response }, others return just the data.
    const maybeArray =
      (Array.isArray((raw as any).data) && (raw as any).data) ||
      (Array.isArray((raw as any).body) && (raw as any).body) ||
      raw;

    const safe = stripCircular(maybeArray);

    return NextResponse.json(safe, { status: 200 });
  } catch (err: any) {
    console.error("SnapTrade accounts error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch accounts from SnapTrade",
        details: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
