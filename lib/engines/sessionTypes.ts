// lib/engines/sessionTypes.ts

export type SessionId = "asia" | "london" | "ny";

export interface SessionLevels {
  high: number | null;
  low: number | null;
  complete: boolean;
}
