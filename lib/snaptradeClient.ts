// lib/snaptradeClient.ts
import { Snaptrade } from "snaptrade-typescript-sdk";

const clientId = process.env.SNAPTRADE_CLIENT_ID;
const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
const environment =
  (process.env.SNAPTRADE_ENVIRONMENT || "production") as
    | "sandbox"
    | "practice"
    | "production";

if (!clientId || !consumerKey) {
  throw new Error("Missing SNAPTRADE_CLIENT_ID or SNAPTRADE_CONSUMER_KEY");
}

export const snaptrade = new Snaptrade({
  clientId,
  consumerKey,
  environment,
});

// User-level credentials for SnapTrade connection.
// These will come from your .env file; we default to empty string so the app still builds.
export const SNAPTRADE_USER_ID =
  process.env.SNAPTRADE_USER_ID ?? "";

export const SNAPTRADE_USER_SECRET =
  process.env.SNAPTRADE_USER_SECRET ?? "";

