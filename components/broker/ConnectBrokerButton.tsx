// components/broker/ConnectBrokerButton.tsx
"use client";

import { useState } from "react";
import { useBrokerStore } from "@/lib/store/brokerStore";

export function ConnectBrokerButton() {
  const [loading, setLoading] = useState(false);
  const setConnection = useBrokerStore((s) => s.setConnection);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/broker/connect");
      const data = await res.json();

      if (!data.ok || !data.connectUrl) {
        console.error("Broker connect failed:", data);
        alert("Broker connect failed (stub). Check console.");
        return;
      }

      setConnection({
        provider: data.provider ?? "snaptrade",
        isConnected: false,
      });

      // Open the broker portal in a new tab
      window.open(data.connectUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Error starting broker connect:", err);
      alert("Error starting broker connect (stub).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={loading}
      className="rounded-md border border-sky-500 px-3 py-1 text-xs font-medium text-sky-200 hover:bg-sky-500/10 disabled:opacity-60"
    >
      {loading ? "Connecting..." : "Connect Broker"}
    </button>
  );
}
