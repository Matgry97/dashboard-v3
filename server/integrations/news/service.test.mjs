import { describe, it, expect, vi } from "vitest";
import { createNewsService, matchTags, safeUrl } from "./service.js";

const source = (id, overrides = {}) => ({
  id,
  name: id,
  category: "tech",
  group: "headlines",
  adapter: id,
  url: `https://${id}.test`,
  homepage: `https://${id}.test`,
  limit: 5,
  ...overrides,
});

const item = (title) => ({ id: title, title, url: `https://x.test/${title}`, publishedAt: null });

describe("matchTags", () => {
  it("matches stack keywords on word boundaries, case-insensitively", () => {
    expect(matchTags("dbt 1.9 released")).toEqual(["dbt"]);
    expect(matchTags("Using adbtool for Android")).toEqual([]);
    expect(matchTags("SNOWFLAKE cuts prices")).toEqual(["snowflake"]);
    expect(matchTags("Claude Code now does dbt")).toEqual(["claude", "dbt"]);
  });
});

describe("safeUrl", () => {
  it("allows only absolute http(s) URLs", () => {
    expect(safeUrl("https://a.test/x")).toBe("https://a.test/x");
    expect(safeUrl("http://a.test")).toBe("http://a.test");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl("/relative")).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
  });
});

describe("news service", () => {
  it("isolates a failing source", async () => {
    const svc = createNewsService({
      sources: [source("good"), source("bad")],
      adapters: {
        good: async () => [item("Hello")],
        bad: async () => {
          throw new Error("HTTP 500");
        },
      },
    });
    const { sections } = await svc.getNews("tech");
    expect(sections[0].items).toHaveLength(1);
    expect(sections[0].error).toBeUndefined();
    expect(sections[1]).toMatchObject({ items: [], error: "HTTP 500" });
  });

  it("only returns sources for the requested category", async () => {
    const svc = createNewsService({
      sources: [source("a"), source("b", { category: "general" })],
      adapters: { a: async () => [], b: async () => [] },
    });
    const { sections } = await svc.getNews("general");
    expect(sections.map((s) => s.source.id)).toEqual(["b"]);
  });

  it("serves from cache within the TTL and refetches after", async () => {
    let t = 0;
    const adapter = vi.fn(async () => [item("A")]);
    const svc = createNewsService({
      sources: [source("a")],
      adapters: { a: adapter },
      now: () => t,
      ttlMs: 1000,
    });
    await svc.getNews("tech");
    t = 500;
    await svc.getNews("tech");
    expect(adapter).toHaveBeenCalledTimes(1);
    t = 1500;
    await svc.getNews("tech");
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("falls back to stale items when a refetch fails", async () => {
    let t = 0;
    const adapter = vi
      .fn()
      .mockResolvedValueOnce([item("Old news")])
      .mockRejectedValueOnce(new Error("down"));
    const svc = createNewsService({
      sources: [source("a")],
      adapters: { a: adapter },
      now: () => t,
      ttlMs: 1000,
    });
    await svc.getNews("tech");
    t = 5000;
    const { sections } = await svc.getNews("tech");
    expect(sections[0].error).toBeUndefined();
    expect(sections[0].items[0].title).toBe("Old news");
  });

  it("tags headlines but not stack release notes", async () => {
    const svc = createNewsService({
      sources: [source("hn"), source("rel", { group: "stack" })],
      adapters: {
        hn: async () => [item("Snowflake acquires something")],
        rel: async () => [item("Snowflake 9.30 release notes")],
      },
    });
    const { sections } = await svc.getNews("tech");
    expect(sections[0].items[0].tags).toEqual(["snowflake"]);
    expect(sections[1].items[0].tags).toBeUndefined();
  });

  it("reports unknown adapters as a section error", async () => {
    const svc = createNewsService({ sources: [source("x")], adapters: {} });
    const { sections } = await svc.getNews("tech");
    expect(sections[0].error).toMatch(/Unknown adapter/);
  });

  it("drops items with unsafe links and strips unsafe comment links", async () => {
    const svc = createNewsService({
      sources: [source("a")],
      adapters: {
        a: async () => [
          { ...item("ok"), commentsUrl: "javascript:alert(1)" },
          { ...item("evil"), url: "javascript:alert(1)" },
          { ...item("data"), url: "data:text/html,hi" },
        ],
      },
    });
    const { sections } = await svc.getNews("tech");
    expect(sections[0].items.map((i) => i.title)).toEqual(["ok"]);
    expect(sections[0].items[0]).not.toHaveProperty("commentsUrl");
  });

  it("shares one upstream fetch between concurrent requests", async () => {
    let release;
    const adapter = vi.fn(() => new Promise((r) => (release = () => r([item("A")]))));
    const svc = createNewsService({ sources: [source("a")], adapters: { a: adapter } });
    const p1 = svc.getNews("tech");
    const p2 = svc.getNews("tech");
    await Promise.resolve();
    release();
    await Promise.all([p1, p2]);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("caches failures briefly instead of refetching every request", async () => {
    let t = 0;
    const adapter = vi.fn(async () => {
      throw new Error("down");
    });
    const svc = createNewsService({
      sources: [source("a")],
      adapters: { a: adapter },
      now: () => t,
      failureTtlMs: 1000,
    });
    await svc.getNews("tech");
    t = 500;
    const { sections } = await svc.getNews("tech");
    expect(sections[0].error).toBe("down");
    expect(adapter).toHaveBeenCalledTimes(1);
    t = 1500;
    await svc.getNews("tech");
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("fresh bypasses the cache, rate-limited per source", async () => {
    let t = 0;
    const adapter = vi.fn(async () => [item("A")]);
    const svc = createNewsService({
      sources: [source("a")],
      adapters: { a: adapter },
      now: () => t,
      ttlMs: 60_000,
      minRefreshMs: 1000,
    });
    await svc.getNews("tech");
    t = 500;
    await svc.getNews("tech", { fresh: true }); // too soon: served from cache
    expect(adapter).toHaveBeenCalledTimes(1);
    t = 1500;
    await svc.getNews("tech", { fresh: true });
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("marks fallback items stale and stops serving them after maxStaleMs", async () => {
    let t = 0;
    const adapter = vi
      .fn()
      .mockResolvedValueOnce([item("Old news")])
      .mockRejectedValue(new Error("down"));
    const svc = createNewsService({
      sources: [source("a")],
      adapters: { a: adapter },
      now: () => t,
      ttlMs: 1000,
      failureTtlMs: 0,
      maxStaleMs: 10_000,
    });
    await svc.getNews("tech");

    t = 5000;
    let { sections } = await svc.getNews("tech");
    expect(sections[0]).toMatchObject({ stale: true, fetchedAt: new Date(0).toISOString() });
    expect(sections[0].items[0].title).toBe("Old news");

    t = 20_000;
    ({ sections } = await svc.getNews("tech"));
    expect(sections[0]).toMatchObject({ items: [], error: "down" });
    expect(sections[0].stale).toBeUndefined();
  });
});
