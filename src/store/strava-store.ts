import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayDateStr } from "../utils/date";

export interface LastRun {
  name: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  total_elevation_gain: number;
  suffer_score: number | null;
}

interface StravaStoreState {
  run: LastRun | null;
  fetchedDate: string | null;
  status: "idle" | "loading" | "success" | "error";
  syncStatus: "idle" | "syncing" | "error";
  error: string | null;
  syncError: string | null;
  fetchIfNeeded: () => void;
  sync: () => void;
}

export const useStravaStore = create<StravaStoreState>()(
  persist(
    (set, get) => ({
      run: null,
      fetchedDate: null,
      status: "idle",
      syncStatus: "idle",
      error: null,
      syncError: null,

      fetchIfNeeded: () => {
        const { fetchedDate, status } = get();
        const today = todayDateStr();
        if (fetchedDate === today && status === "success") return;
        if (status === "loading") return;

        set({ status: "loading", error: null });
        fetch("/api/strava/last-run")
          .then(async (res) => {
            const data = await res.json();
            if (!data.ok) throw new Error(data.message);
            set({ run: data.data, fetchedDate: today, status: "success", error: null });
          })
          .catch((e) => set({ status: "error", error: e.message }));
      },

      sync: () => {
        if (get().syncStatus === "syncing") return;
        set({ syncStatus: "syncing", syncError: null });

        fetch("/api/strava/sync", { method: "POST" })
          .then(async (res) => {
            const data = await res.json();
            if (!data.ok) throw new Error(data.message);
            set({ run: data.data, fetchedDate: todayDateStr(), status: "success", syncStatus: "idle" });
          })
          .catch((e) => set({ syncStatus: "error", syncError: e.message }));
      },
    }),
    {
      name: "strava-storage",
      partialize: (state) => ({
        run: state.run,
        fetchedDate: state.fetchedDate,
        status: state.status === "success" ? "success" : "idle",
      }),
    }
  )
);
