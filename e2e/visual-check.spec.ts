import { test } from "@playwright/test";

test("screenshot dashboard with all widgets", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(1000);

  const addBtn = page.locator("text=+ Add Widget").or(page.locator("text=Add Widget")).first();
  await addBtn.click();
  await page.waitForTimeout(500);

  // Add all widgets one by one
  const widgetNames = ["Clock", "Today's Weather", "5-Day Forecast", "Last Workout", "Run Map", "Weekly Planner"];
  for (const name of widgetNames) {
    const cards = page.locator("[class*='widgetCard']");
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent();
      if (text?.includes(name)) {
        await cards.nth(i).locator("button").click();
        await page.waitForTimeout(300);
        break;
      }
    }
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "e2e/screenshots/all-widgets.png", fullPage: true });
});
