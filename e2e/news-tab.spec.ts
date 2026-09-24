import { test, expect, type Page } from "@playwright/test";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const section = (id: string, name: string, group: "stack" | "headlines", titles: string[], extra = {}) => ({
  source: { id, name, group, homepage: `https://${id}.example` },
  items: titles.map((title, i) => ({
    id: `${id}-${i}`,
    title,
    url: `https://${id}.example/${i}`,
    publishedAt: hoursAgo(i * 30 + 2),
    ...extra,
  })),
  fetchedAt: new Date().toISOString(),
});

const TECH = {
  category: "tech",
  sections: [
    section("snowflake", "Snowflake", "stack", ["9.30 release notes", "Cortex AI updates", "Behavior change bundle 2026_05"]),
    section("claude-code", "Claude Code", "stack", ["v2.1.281", "v2.1.280", "v2.1.279"]),
    section("dbt-core", "dbt Core", "stack", ["v1.11.2", "v1.11.1", "v1.11.0"]),
    section("dbt-blog", "dbt Labs blog", "stack", ["Semantic layer deep dive", "State of analytics engineering"]),
    {
      ...section("hackernews", "Hacker News", "headlines", [
        "Show HN: A tiny database written in a weekend",
        "Snowflake announces open table format support",
        "Why we moved off Kubernetes",
        "A very long headline that should wrap nicely without overflowing the card on a small Raspberry Pi display",
        "Ask HN: What are you working on?",
      ], { score: 312, commentsUrl: "https://news.ycombinator.com/item?id=1" }),
    },
    section("kode24", "kode24", "headlines", ["Utviklere vil ha mer TypeScript", "Slik bruker NAV dbt", "Lønnsundersøkelsen 2026"]),
    { ...section("tek", "Tek.no", "headlines", []), error: "HTTP 404 from www.tek.no" },
  ],
};
TECH.sections[4].items[1].tags = ["snowflake"];
TECH.sections[5].items[1].tags = ["dbt"];

const GENERAL = {
  category: "general",
  sections: [
    section("nrk", "NRK", "headlines", ["Regjeringen legger fram statsbudsjettet", "Storm på Vestlandet", "Ny rekord i Holmenkollen"]),
    section("gamer", "Gamer.no", "headlines", ["Anmeldelse: Et nytt spill", "Nintendo avslører ny konsoll"]),
  ],
};

async function setup(page: Page) {
  await page.route("**/api/news?category=*", (route) => {
    const cat = new URL(route.request().url()).searchParams.get("category");
    route.fulfill({ json: { ok: true, data: cat === "general" ? GENERAL : TECH } });
  });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test("news tab: switch, sections, persistence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);

  const newsTab = page.getByRole("button", { name: "News", exact: true });
  await expect(newsTab).toBeVisible();
  await expect(newsTab).not.toContainText("×");
  await newsTab.click();

  await expect(page.getByRole("radio", { name: "Tech" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("+ Add Widget")).toHaveCount(0);

  const stackTitle = page.getByRole("heading", { name: "Your stack" });
  const headlinesTitle = page.getByRole("heading", { name: "Headlines" });
  await expect(stackTitle).toBeVisible();
  const stackY = (await stackTitle.boundingBox())!.y;
  const headlinesY = (await headlinesTitle.boundingBox())!.y;
  expect(stackY).toBeLessThan(headlinesY);

  // Failed source is isolated
  await expect(page.getByTestId("news-section-tek")).toContainText("Couldn't load Tek.no");
  await expect(page.getByTestId("news-section-hackernews")).toContainText("312 pts");
  await expect(page.getByTestId("news-section-hackernews").getByText("snowflake", { exact: true })).toBeVisible();
  await expect(page.getByTestId("news-section-snowflake").getByText("New").first()).toBeVisible();

  await page.screenshot({ path: "e2e/screenshots/news-tech.png", fullPage: true });

  await page.getByRole("radio", { name: "General" }).click();
  await expect(page.getByTestId("news-section-nrk")).toBeVisible();
  await expect(page.getByTestId("news-section-gamer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your stack" })).toHaveCount(0);
  await page.screenshot({ path: "e2e/screenshots/news-general.png", fullPage: true });

  await page.reload();
  await expect(page.getByRole("radio", { name: "General" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("news-section-nrk")).toBeVisible();

  // Regular tab still works
  await page.getByRole("button", { name: /^Dashboard/ }).click();
  await expect(page.getByText("+ Add Widget")).toBeVisible();
});

test("news tab fits the Pi display with touch-sized controls", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 480 });
  await setup(page);
  await page.getByRole("button", { name: "News", exact: true }).click();
  await expect(page.getByTestId("news-section-hackernews")).toBeVisible();

  const overflow = await page.evaluate(() => {
    const el = document.querySelector("[class*='content']") as HTMLElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(0);

  for (const loc of [
    page.getByRole("radio", { name: "Tech" }),
    page.getByRole("radio", { name: "General" }),
    page.getByRole("button", { name: "Refresh news" }),
  ]) {
    const box = (await loc.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: "e2e/screenshots/news-pi.png", fullPage: true });
});

test("news tab shows full error with retry when every source fails", async ({ page }) => {
  await page.route("**/api/news?category=*", (route) =>
    route.fulfill({ status: 502, json: { ok: false, error: "NEWS_UNAVAILABLE", message: "All news sources failed to load" } })
  );
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "News", exact: true }).click();
  await expect(page.getByText("All news sources failed to load")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
