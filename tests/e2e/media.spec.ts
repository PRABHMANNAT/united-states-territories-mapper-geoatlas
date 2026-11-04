import { expect, test } from "@playwright/test";

test("renders the original social card artwork", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "One canonical image size");
  await page.setViewportSize({ width: 1200, height: 630 });
  const response = await page.goto("/social.svg");
  expect(response?.ok()).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("social.png") });
});
