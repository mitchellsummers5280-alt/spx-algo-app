// app/api/snaptrade/positions/route.ts
import { NextResponse } from "next/server";
import { snaptrade } from "@/lib/snaptradeClient";

const USER_ID = process.env.SNAPTRADE_USER_ID!;
const USER_SECRET = process.env.SNAPTRADE_USER_SECRET!;

// Remove circular references so NextResponse.json can serialize
function stripCircular<T>(value: T): T {
  const seen = new WeakSet<object>();

  const json = JSON.stringify(value as any, (_key, val) => {
    if (val && typeof val === "object") {
      if (seen.has(val as object)) return;
      seen.add(val as object);
    }
    return val;
  });

  return JSON.parse(json);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json(
      { error: "Missing accountId query parameter" },
      { status: 400 }
    );
  }

  if (!USER_ID || !USER_SECRET) {
    return NextResponse.json(
      { error: "Missing SNAPTRADE_USER_ID or SNAPTRADE_USER_SECRET" },
      { status: 500 }
    );
  }

  try {
    // 🔑 Use the ALL-holdings endpoint (no accountId)
    const raw = await snaptrade.accountInformation.getAllUserHoldings({
      userId: USER_ID,
      userSecret: USER_SECRET,
    });

    const data = (raw as any).data ?? raw;

    let result: any = data;

    // data here should be an array of holdings objects, one per account
    if (Array.isArray(data)) {
      const match = data.find((h: any) => {
        const acct = h?.account;
        return (
          acct?.id === accountId ||
          acct?.account_id === accountId ||
          h?.accountId === accountId
        );
      });

      // If nothing matched, just return an empty structure
      result =
        match ??
        {
          positions: [],
          note:
            "No holdings found for this accountId in getAllUserHoldings result.",
        };
    }

    const safe = stripCircular(result);

    return NextResponse.json(safe, { status: 200 });
  } catch (err: any) {
    console.error("SnapTrade getAllUserHoldings error:", err?.response?.data ?? err);

    return NextResponse.json(
      {
        error: "Failed to fetch positions/holdings from SnapTrade",
        details:
          err?.response?.data?.message ??
          err?.message ??
          "Unknown error",
      },
      { status: 500 }
    );
  }
}
