// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useNewsStore, NEWS_TTL_MS } from "./news-store";
import type { NewsResponse } from "../types/news";

const TECH: NewsResponse = {
  category: "tech",
  sections: [
    {
      source: { id: "hackernews", name: "Hacker News", group: "headlines", homepage: "https://news.ycombinator.com/" },
      items: [{ id: "1", title: "Hello", url: "https://a.test", publishedAt: null }],
      fetchedAt: "2026-09-24T08:00:00.000Z",
    },
  ],
};

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  useNewsStore.setState({ category: "tech", data: {}, fetchedAt: {}, status: {}, error: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("news-store", () => {
  it("fetches and stores a category", async () => {
    const fetchSpy = mockFetch({ ok: true, data: TECH });
    useNewsStore.getState().fetchIfNeeded("tech");
    await vi.waitFor(() => expect(useNewsStore.getState().status.tech).toBe("success"));

    expect(fetchSpy).toHaveBeenCalledWith("/api/news?category=tech");
    expect(useNewsStore.getState().data.tech).toEqual(TECH);
  });

  it("skips fetching when data is fresh", () => {
    const fetchSpy = mockFetch({ ok: true, data: TECH });
    useNewsStore.setState({ data: { tech: TECH }, fetchedAt: { tech: Date.now() - 1000 } });
    useNewsStore.getState().fetchIfNeeded("tech");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refetches once data is older than the TTL", () => {
    const fetchSpy = mockFetch({ ok: true, data: TECH });
    useNewsStore.setState({ data: { tech: TECH }, fetchedAt: { tech: Date.now() - NEWS_TTL_MS - 1 } });
    useNewsStore.getState().fetchIfNeeded("tech");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("refresh always fetches and bypasses the server cache", () => {
    const fetchSpy = mockFetch({ ok: true, data: TECH });
    useNewsStore.setState({ data: { tech: TECH }, fetchedAt: { tech: Date.now() } });
    useNewsStore.getState().refresh("tech");
    expect(fetchSpy).toHaveBeenCalledWith("/api/news?category=tech&fresh=1");
  });

  it("stores the error message from an error envelope", async () => {
    mockFetch({ ok: false, error: "NEWS_UNAVAILABLE", message: "All news sources failed to load" });
    useNewsStore.getState().fetchIfNeeded("general");
    await vi.waitFor(() => expect(useNewsStore.getState().status.general).toBe("error"));
    expect(useNewsStore.getState().error.general).toBe("All news sources failed to load");
  });

  it("setCategory switches and fetches that category", () => {
    const fetchSpy = mockFetch({ ok: true, data: { category: "general", sections: [] } });
    useNewsStore.getState().setCategory("general");
    expect(useNewsStore.getState().category).toBe("general");
    expect(fetchSpy).toHaveBeenCalledWith("/api/news?category=general");
  });
});
