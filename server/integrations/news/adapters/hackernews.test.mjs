import { describe, it, expect, vi, afterEach } from "vitest";
import { hackernews } from "./hackernews.js";

const BASE = "https://hn.test/v0";

const ITEMS = {
  1: { id: 1, title: "Show off", url: "https://a.test", score: 120, time: 1790000000 },
  2: { id: 2, title: "Ask HN: something?", score: 40, time: 1790000100 },
  3: { id: 3, title: "Gone", deleted: true },
};

function mockFetch() {
  return vi.fn(async (url) => {
    const body = url.endsWith("/topstories.json")
      ? [1, 2, 3, 4]
      : ITEMS[Number(url.match(/item\/(\d+)\.json/)[1])];
    return { ok: true, status: 200, headers: new Headers(), text: async () => JSON.stringify(body) };
  });
}

describe("hackernews adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps top stories, respecting limit", async () => {
    const fetch = mockFetch();
    vi.stubGlobal("fetch", fetch);
    const items = await hackernews({ url: BASE, limit: 3 });

    expect(fetch).toHaveBeenCalledTimes(4); // topstories + 3 items
    expect(items).toHaveLength(2); // deleted story dropped
    expect(items[0]).toEqual({
      id: "1",
      title: "Show off",
      url: "https://a.test",
      publishedAt: new Date(1790000000 * 1000).toISOString(),
      score: 120,
      commentsUrl: "https://news.ycombinator.com/item?id=1",
    });
  });

  it("uses the discussion link for text posts", async () => {
    vi.stubGlobal("fetch", mockFetch());
    const [, ask] = await hackernews({ url: BASE, limit: 2 });
    expect(ask.url).toBe("https://news.ycombinator.com/item?id=2");
  });
});
