import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayDateStr } from "../utils/date";

const API_URL = "/api/weather/current";

interface WeatherStoreState {
  timeseries: any[] | null;
  fetchedDate: string | null;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  fetchIfNeeded: () => void;
}

export const useWeatherStore = create<WeatherStoreState>()(
  persist(
    (set, get) => ({
      timeseries: null,
      fetchedDate: null,
      status: "idle",
      error: null,

      fetchIfNeeded: () => {
        const { fetchedDate, status } = get();
        const today = todayDateStr();

        if (fetchedDate === today && status === "success") return;
        if (status === "loading") return;

        set({ status: "loading", error: null });

        fetch(API_URL)
          .then((res) => {
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            return res.json();
          })
          .then((json) => {
            if (!json.ok) throw new Error(json.message);
            set({
              timeseries: json.data.properties.timeseries,
              fetchedDate: today,
              status: "success",
              error: null,
            });
          })
          .catch((err) => {
            set({ status: "error", error: err.message });
          });
      },
    }),
    {
      name: "weather-storage",
      partialize: (state) => ({
        timeseries: state.timeseries,
        fetchedDate: state.fetchedDate,
        status: state.status === "success" ? "success" : "idle",
      }),
    }
  )
);
