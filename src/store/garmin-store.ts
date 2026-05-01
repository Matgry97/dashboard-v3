import { create } from "zustand";

export interface LastWorkout {
  name: string;
  sport: string;
  start_time: string;
  elapsed_time: string;
  distance: number;
  calories: number;
  avg_hr: number;
}

interface GarminStoreState {
  workout: LastWorkout | null;
  status: "idle" | "loading" | "success" | "error";
  syncStatus: "idle" | "syncing" | "error";
  error: string | null;
  syncError: string | null;
  fetch: () => void;
  sync: () => void;
}

export const useGarminStore = create<GarminStoreState>()((set, get) => ({
  workout: null,
  status: "idle",
  syncStatus: "idle",
  error: null,
  syncError: null,

  fetch: () => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });

    fetch("/api/garmin/last-workout")
      .then((res) => res.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.message);
        set({ workout: json.data, status: "success" });
      })
      .catch((err) => {
        set({ status: "error", error: err.message });
      });
  },

  sync: () => {
    if (get().syncStatus === "syncing") return;
    set({ syncStatus: "syncing", syncError: null });

    fetch("/api/garmin/sync", { method: "POST" })
      .then((res) => res.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.message);
        set({ workout: json.data, status: "success", syncStatus: "idle" });
      })
      .catch((err) => {
        set({ syncStatus: "error", syncError: err.message });
      });
  },
}));
