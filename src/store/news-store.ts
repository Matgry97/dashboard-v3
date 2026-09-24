import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NewsCategory, NewsResponse } from "../types/news";

const API_URL = "/api/news";
export const NEWS_TTL_MS = 30 * 60 * 1000;

type Status = "idle" | "loading" | "success" | "error";

interface NewsStoreState {
  category: NewsCategory;
  data: Partial<Record<NewsCategory, NewsResponse>>;
  fetchedAt: Partial<Record<NewsCategory, number>>;
  status: Partial<Record<NewsCategory, Status>>;
  error: Partial<Record<NewsCategory, string | null>>;
  setCategory: (category: NewsCategory) => void;
  fetchIfNeeded: (category: NewsCategory) => void;
  refresh: (category: NewsCategory) => void;
}

export const useNewsStore = create<NewsStoreState>()(
  persist(
    (set, get) => {
      const load = (category: NewsCategory, fresh = false) => {
        set((s) => ({
          status: { ...s.status, [category]: "loading" },
          error: { ...s.error, [category]: null },
        }));

        fetch(`${API_URL}?category=${category}${fresh ? "&fresh=1" : ""}`)
          .then((res) =>
            // Error envelopes are JSON too; anything else (e.g. proxy HTML) isn't
            res.json().catch(() => {
              throw new Error(`API error: ${res.status}`);
            })
          )
          .then((json) => {
            if (!json.ok) throw new Error(json.message);
            set((s) => ({
              data: { ...s.data, [category]: json.data },
              fetchedAt: { ...s.fetchedAt, [category]: Date.now() },
              status: { ...s.status, [category]: "success" },
            }));
          })
          .catch((err) => {
            set((s) => ({
              status: { ...s.status, [category]: "error" },
              error: { ...s.error, [category]: err.message },
            }));
          });
      };

      return {
        category: "tech",
        data: {},
        fetchedAt: {},
        status: {},
        error: {},

        setCategory: (category) => {
          set({ category });
          get().fetchIfNeeded(category);
        },

        fetchIfNeeded: (category) => {
          const { status, fetchedAt, data } = get();
          if (status[category] === "loading") return;
          const last = fetchedAt[category];
          if (data[category] && last && Date.now() - last < NEWS_TTL_MS) return;
          load(category);
        },

        refresh: (category) => {
          if (get().status[category] === "loading") return;
          // Bypass the server cache too, otherwise ↻ could return 15-min-old news
          load(category, true);
        },
      };
    },
    {
      name: "news-storage",
      partialize: (state) => ({
        category: state.category,
        data: state.data,
        fetchedAt: state.fetchedAt,
      }),
    }
  )
);
