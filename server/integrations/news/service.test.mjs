import { describe, it, expect, vi } from "vitest";
import { createNewsService, matchTags } from "./service.js";

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
});
