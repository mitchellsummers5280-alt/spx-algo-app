import { create } from "zustand";

export type SessionDayKey = string; // "YYYY-MM-DD" NY day key

export type EsSessionLevels = {
  day: SessionDayKey;
  asiaHigh: number | null;
  asiaLow: number | null;
  londonHigh: number | null;
  londonLow: number | null;
  updatedAt: number;
};

export type SpxNyLevels = {
  day: SessionDayKey;
  nyHigh: number | null;
  nyLow: number | null;
  updatedAt: number;
};

export type SweepFlags = {
  sweptAsiaHigh: boolean;
  sweptAsiaLow: boolean;
  sweptLondonHigh: boolean;
  sweptLondonLow: boolean;
  sweptNYHigh: boolean;
  sweptNYLow: boolean;
};

type State = {
  es: EsSessionLevels;
  spx: SpxNyLevels;
  sweeps: SweepFlags;

  setEs: (patch: Partial<EsSessionLevels>) => void;
  setSpx: (patch: Partial<SpxNyLevels>) => void;
  setSweeps: (patch: Partial<SweepFlags>) => void;

  resetForDay: (day: SessionDayKey) => void;
};

const emptyEs: EsSessionLevels = {
  day: "",
  asiaHigh: null,
  asiaLow: null,
  londonHigh: null,
  londonLow: null,
  updatedAt: 0,
};

const emptySpx: SpxNyLevels = {
  day: "",
  nyHigh: null,
  nyLow: null,
  updatedAt: 0,
};

const emptySweeps: SweepFlags = {
  sweptAsiaHigh: false,
  sweptAsiaLow: false,
  sweptLondonHigh: false,
  sweptLondonLow: false,
  sweptNYHigh: false,
  sweptNYLow: false,
};

export const useSessionLevelsStore = create<State>((set) => ({
  es: emptyEs,
  spx: emptySpx,
  sweeps: emptySweeps,

  setEs: (patch) =>
    set((s) => ({
      es: { ...s.es, ...patch, updatedAt: Date.now() },
    })),

  setSpx: (patch) =>
    set((s) => ({
      spx: { ...s.spx, ...patch, updatedAt: Date.now() },
    })),

  setSweeps: (patch) =>
    set((s) => ({
      sweeps: { ...s.sweeps, ...patch },
    })),

  resetForDay: (day) =>
    set(() => ({
      es: { ...emptyEs, day, updatedAt: Date.now() },
      spx: { ...emptySpx, day, updatedAt: Date.now() },
      sweeps: { ...emptySweeps },
    })),
}));
