"use client";

import { useEffect, useRef } from "react";
import { useSessionLevelsStore } from "@/lib/store/sessionLevelsStore";

function fmtNY(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // YYYY-MM-DD
}

function todayNY(): string {
  return fmtNY(new Date());
}

function yesterdayNY(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return fmtNY(d);
}

type ApiResp = {
  ok?: boolean;
  day?: string;
  ticker?: string;
  asia?: { high: number; low: number } | null;
  london?: { high: number; low: number } | null;
  error?: string;
};

export function useInstitutionalSessions() {
  const setEs = useSessionLevelsStore((s) => s.setEs);

  const lastKeyRef = useRef<string | null>(null);
  const lastAtRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    const fetchLevels = async (day: string) => {
      const ticker = "ESH6"; // keep consistent with your API tests
      const res = await fetch(
        `/api/es/session-levels?day=${day}&ticker=${ticker}&nocache=1`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as ApiResp;
      return data;
    };

    const tick = async () => {
      const now = Date.now();
      // throttle
      if (now - lastAtRef.current < 60_000) return;
      lastAtRef.current = now;

      const primaryDay = todayNY();
      const key = `ES|${primaryDay}`;
      if (lastKeyRef.current === key) return;
      lastKeyRef.current = key;

      try {
        // 1) try today (overnight sessions for today)
        let data = await fetchLevels(primaryDay);

        // 2) fallback to yesterday if today is blocked by provider
        if (!data?.ok) {
          const fallbackDay = yesterdayNY();
          data = await fetchLevels(fallbackDay);
        }

        if (cancelled) return;

        // ✅ ONLY write to store on a valid payload
        const aH = data?.asia?.high;
        const aL = data?.asia?.low;
        const lH = data?.london?.high;
        const lL = data?.london?.low;

        const valid =
          data?.ok === true &&
          typeof data.day === "string" &&
          typeof aH === "number" &&
          typeof aL === "number" &&
          typeof lH === "number" &&
          typeof lL === "number";

        if (!valid) {
          // IMPORTANT: do NOT clobber existing levels with errors/nulls
          return;
        }

        setEs({
          day: data.day!,
          asiaHigh: aH!,
          asiaLow: aL!,
          londonHigh: lH!,
          londonLow: lL!,
        });
      } catch (e) {
        // do not clobber store on errors
        console.error("[useInstitutionalSessions] error:", e);
      }
    };

    tick();
    const id = window.setInterval(tick, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [setEs]);
}
