"use client";

import { useState } from "react";

export function ConnectBrokerButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/snaptrade/login");

      if (!res.ok) {
        throw new Error("Failed to get SnapTrade connection URL");
      }

      const data = await res.json();

      if (!data.redirectURI) {
        throw new Error("No redirectURI returned from API");
      }

      // Open SnapTrade Connection Portal
      window.open(data.redirectURI, "_blank");

    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl border border-emerald-500 px-4 py-2 text-sm font-semibold 
                   text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-60"
      >
        {loading ? "Connecting…" : "Connect Broker"}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
