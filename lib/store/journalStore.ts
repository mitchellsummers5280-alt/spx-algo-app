// lib/store/journalStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JournalEntry } from "@/lib/journal/journalTypes";

type JournalState = {
  entries: JournalEntry[];
  addEntry: (entry: JournalEntry) => void;
  clearAll: () => void;
};

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) =>
        set({
          // newest first
          entries: [entry, ...get().entries],
        }),
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: "spice-journal", // 🔑 key in localStorage
    }
  )
);
