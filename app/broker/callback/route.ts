// app/api/broker/callback/route.ts
import { NextResponse } from "next/server";

// This route is intended as the OAuth redirect / callback target.
// For now, it just logs whatever query params it receives.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = Object.fromEntries(url.searchParams.entries());

  console.log("[broker/callback] Received query params:", search);

  // TODO:
  // - Validate state tokens
  // - Exchange codes for access tokens
  // - Store tokens securely (for your single owner)

  // For now, just show a simple HTML message in the browser.
  const body = `
    <html>
      <body style="background:#020617;color:#e5e7eb;font-family:system-ui;padding:2rem">
        <h1>Broker Connected (Callback Stub)</h1>
        <p>This is the placeholder callback route. Check your server logs for details.</p>
        <pre style="font-size:12px;background:#0b1120;padding:1rem;border-radius:8px;overflow:auto">
${JSON.stringify(search, null, 2)}
        </pre>
        <p>You can close this tab and return to SPICE.</p>
      </body>
    </html>
  `;

  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
