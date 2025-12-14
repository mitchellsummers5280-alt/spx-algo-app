// lib/utils/marketTime.ts
export type SessionWindow = {
  startHHMM: string; // "09:30"
  endHHMM: string;   // "23:59"
};

function hhmmToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
  return h * 60 + m;
}

// Returns minutes since midnight in America/New_York
export function getEtMinutesNow(now = new Date()) {
  // Convert "now" to ET clock time using Intl (no external deps)
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(now);
  const hh = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const mm = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return hh * 60 + mm;
}

export function formatEtTime(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);
}

export function inSessionWindow(
  minutesNow: number,
  window: SessionWindow = { startHHMM: "09:30", endHHMM: "23:59" }
) {
  const start = hhmmToMinutes(window.startHHMM);
  const end = hhmmToMinutes(window.endHHMM);
  return minutesNow >= start && minutesNow <= end;
}
