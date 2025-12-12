// app/api/snaptrade/login/route.ts
import { NextResponse } from "next/server";
import {
  snaptrade,
  SNAPTRADE_USER_ID,
  SNAPTRADE_USER_SECRET,
} from "@/lib/snaptradeClient";

export async function GET() {
  try {
    const response = await snaptrade.authentication.loginSnapTradeUser({
      userId: SNAPTRADE_USER_ID,
      userSecret: SNAPTRADE_USER_SECRET,
      connectionType: "read",
      connectionPortalVersion: "v4",
      darkMode: true,
      showCloseButton: true,
    });

    // SDK sometimes returns { data: {...} }, sometimes just {...}
    const data: any = (response as any).data ?? response;

    if (!data.redirectURI) {
      throw new Error("No redirectURI returned from SnapTrade");
    }

    return NextResponse.json({
      redirectURI: data.redirectURI,
      sessionId: data.sessionId ?? null,
    });
  } catch (error: any) {
    const snapError =
      error?.response?.data ||
      error?.body ||
      error?.message ||
      "Unknown SnapTrade error";

    console.error("SnapTrade login error:", snapError);

    return NextResponse.json(
      { error: snapError },
      { status: 500 }
    );
  }
}
