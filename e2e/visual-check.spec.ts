import { test } from "@playwright/test";

test("screenshot run map at various sizes", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(1000);

  // Add run map widget
  const addBtn = page.locator("text=+ Add Widget").or(page.locator("text=Add Widget")).first();
  await addBtn.click();
  await page.waitForTimeout(500);
  const cards = page.locator("[class*='widgetCard']");
  const cardCount = await cards.count();
  for (let i = 0; i < cardCount; i++) {
    const text = await cards.nth(i).textContent();
    if (text?.includes("Run Map")) {
      await cards.nth(i).locator("button").click();
      break;
    }
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(3000);

  // Full dashboard at 1400px
  await page.screenshot({ path: "e2e/screenshots/map-1400.png", fullPage: true });

  // Crop just the widget area
  const widgets = page.locator("[class*='shell']").first();
  if (await widgets.isVisible()) {
    await widgets.screenshot({ path: "e2e/screenshots/map-widget-crop.png" });
  }

  // Narrow viewport
  await page.setViewportSize({ width: 900, height: 800 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "e2e/screenshots/map-900.png", fullPage: true });
});
