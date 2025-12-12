// app/api/snaptrade/transactions/route.ts
import { NextResponse } from "next/server";
import { snaptrade } from "@/lib/snaptradeClient";

const USER_ID = process.env.SNAPTRADE_USER_ID!;
const USER_SECRET = process.env.SNAPTRADE_USER_SECRET!;

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
    const raw = await snaptrade.accountInformation.getAccountActivities({
      userId: USER_ID,
      userSecret: USER_SECRET,
      accountId,
    });

    // The SDK usually returns { data, ... } – fall back to raw if not.
    const data = (raw as any).data ?? raw;

    const safe = stripCircular(data);

    return NextResponse.json(safe, { status: 200 });
  } catch (err: any) {
    console.error("SnapTrade transactions error:", err?.response?.data ?? err);
    return NextResponse.json(
      {
        error: "Failed to fetch transactions from SnapTrade",
        details:
          err?.response?.data?.message ??
          err?.message ??
          "Unknown error",
      },
      { status: 500 }
    );
  }
}
