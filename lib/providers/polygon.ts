// lib/providers/polygon.ts

const BASE = "https://api.polygon.io";

export async function fetchPolygon(path: string, params: Record<string, any> = {}) {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) throw new Error("Missing POLYGON_API_KEY");

  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
  });
  url.searchParams.append("apiKey", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error("Polygon Error:", await res.text());
    throw new Error(`Polygon API error: ${res.status}`);
  }

  return res.json();
}
