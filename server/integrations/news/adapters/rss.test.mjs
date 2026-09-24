import { describe, it, expect } from "vitest";
import { parseFeed } from "./rss.js";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>kode24</title>
  <item>
    <title>Older story</title>
    <link>https://example.no/older</link>
    <guid>older-1</guid>
    <pubDate>Mon, 21 Sep 2026 08:00:00 +0200</pubDate>
    <description><![CDATA[<p>Some <b>bold</b> text &amp; more</p>]]></description>
  </item>
  <item>
    <title>Newest story</title>
    <link>https://example.no/newest</link>
    <guid>newest-1</guid>
    <pubDate>Wed, 23 Sep 2026 10:00:00 +0200</pubDate>
  </item>
  <item>
    <title>Middle story</title>
    <link>https://example.no/middle</link>
    <pubDate>Tue, 22 Sep 2026 10:00:00 +0200</pubDate>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Release notes from dbt-core</title>
  <entry>
    <id>tag:github.com,2008:Repository/1/v1.10.0</id>
    <updated>2026-09-20T12:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/dbt-labs/dbt-core/releases/tag/v1.10.0"/>
    <title>v1.10.0</title>
    <content type="html">&lt;h2&gt;What's new&lt;/h2&gt;&lt;p&gt;Faster parsing&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/1/v1.10.1</id>
    <updated>2026-09-22T12:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://github.com/dbt-labs/dbt-core/releases/tag/v1.10.1"/>
    <title>v1.10.1</title>
  </entry>
</feed>`;

const SINGLE = `<rss version="2.0"><channel>
  <item><title>Only one</title><link>https://example.no/one</link></item>
</channel></rss>`;

describe("parseFeed", () => {
  it("parses RSS 2.0 sorted newest first", () => {
    const items = parseFeed(RSS, 10);
    expect(items.map((i) => i.title)).toEqual(["Newest story", "Middle story", "Older story"]);
    expect(items[0]).toMatchObject({
      id: "newest-1",
      url: "https://example.no/newest",
      publishedAt: "2026-09-23T08:00:00.000Z",
    });
  });

  it("falls back to link as id when guid is missing", () => {
    const middle = parseFeed(RSS, 10).find((i) => i.title === "Middle story");
    expect(middle?.id).toBe("https://example.no/middle");
  });

  it("strips HTML from summaries", () => {
    const older = parseFeed(RSS, 10).find((i) => i.title === "Older story");
    expect(older?.summary).toBe("Some bold text & more");
  });

  it("respects the limit", () => {
    expect(parseFeed(RSS, 2)).toHaveLength(2);
  });

  it("parses Atom (GitHub releases)", () => {
    const items = parseFeed(ATOM, 5);
    expect(items.map((i) => i.title)).toEqual(["v1.10.1", "v1.10.0"]);
    expect(items[1]).toMatchObject({
      url: "https://github.com/dbt-labs/dbt-core/releases/tag/v1.10.0",
      publishedAt: "2026-09-20T12:00:00.000Z",
      summary: "What's new Faster parsing",
    });
  });

  it("handles a single-item feed", () => {
    const items = parseFeed(SINGLE, 5);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "Only one", publishedAt: null });
  });

  it("decodes entities exactly once", () => {
    const xml = `<rss><channel>
      <item><title>Use &amp;lt;div&amp;gt; &amp; friends</title><link>https://x.test/1</link>
        <description>&lt;p&gt;Escaped &amp;amp;lt;tag&amp;amp;gt; in HTML&lt;/p&gt;</description></item>
    </channel></rss>`;
    const [item] = parseFeed(xml, 5);
    expect(item.title).toBe("Use &lt;div&gt; & friends");
    expect(item.summary).toBe("Escaped &lt;tag&gt; in HTML");
  });

  it("strips tags from Atom html titles only", () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry><title type="html">&lt;b&gt;Bold&lt;/b&gt; release</title><link href="https://x.test/a"/><id>a</id></entry>
      <entry><title>Plain &lt;b&gt; text</title><link href="https://x.test/b"/><id>b</id></entry>
    </feed>`;
    const titles = parseFeed(xml, 5).map((i) => i.title).sort();
    expect(titles).toEqual(["Bold release", "Plain <b> text"]);
  });

  it("throws on non-feed XML", () => {
    expect(() => parseFeed("<html><body>nope</body></html>", 5)).toThrow(/Not an RSS or Atom/);
  });
});
