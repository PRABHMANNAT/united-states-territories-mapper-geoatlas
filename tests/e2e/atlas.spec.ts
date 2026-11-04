import { expect, test } from "@playwright/test";

test("opens the atlas, chooses an island and navigates to its profile", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The United States, explored." })).toBeVisible();
  await page.getByRole("link", { name: "Explore the atlas" }).click();
  await expect(page.getByRole("heading", { name: "Interactive atlas", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/map$/);
  await page.getByRole("button", { name: "Texas", exact: true }).locator("text").click();
  await expect(page.getByRole("heading", { name: "Texas", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Jump to a jurisdiction" }).selectOption("GU");
  await expect(page.getByRole("heading", { name: "Guam", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/region=GU/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Guam", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Open profile" }).click();
  await expect(page).toHaveURL(/regions\/guam$/);
  await expect(page.getByRole("heading", { name: "Geography", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Flag of Guam" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("changes a ranking, downloads CSV, and compares two places", async ({ page }) => {
  await page.goto("/rankings?metric=land");
  await expect(page.locator("tbody tr").first()).toContainText("Alaska");
  await page.getByRole("button", { name: "High to low" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Rhode Island");
  await expect(page).toHaveURL(/order=asc/);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("stateatlas-land-2026.csv");
  await page.getByRole("checkbox", { name: "Compare Alaska", exact: true }).check();
  await page.getByRole("checkbox", { name: "Compare Rhode Island", exact: true }).check();
  await page.getByRole("link", { name: "Compare 2 selected" }).click();
  await expect(page.getByRole("columnheader", { name: "Alaska", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Find a country match" })).toBeVisible();
});

test("edits a map, undoes a change and exports a vector image", async ({ page }) => {
  await page.goto("/creator");
  await page.getByRole("textbox", { name: "Map title" }).fill("My field map");
  await page.getByRole("combobox", { name: "Toggle a jurisdiction" }).selectOption("CA");
  await page.getByRole("button", { name: "Apply group" }).click();
  await expect(page.getByRole("button", { name: "California", exact: true }).locator("path.region-path")).toHaveAttribute("fill", "#cb9567");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: "California", exact: true }).locator("path.region-path")).not.toHaveAttribute("fill", "#cb9567");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("stateatlas-custom.svg");
  const imageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  expect((await imageDownload).suggestedFilename()).toBe("stateatlas-custom.png");
});

test("supports command search, timeline playback and JSON API", async ({ page, request }) => {
  await page.goto("/timeline");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Reference year" })).toHaveAttribute("aria-valuetext", "2021");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Search the atlas" }).click();
  await page.getByRole("textbox", { name: "Search StateAtlas" }).fill("Puerto Rico");
  await page.getByRole("textbox", { name: "Search StateAtlas" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Puerto Rico", exact: true })).toBeVisible();
  const response = await request.get("/api/v1/rankings?metric=gdp&limit=2");
  expect(response.ok()).toBe(true);
  expect((await response.json()).data.items[0].region.id).toBe("CA");
});

test("captures the home layout with no horizontal overflow", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The United States, explored." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath(`home-${testInfo.project.name}.png`), fullPage: true });
});

test("reports missing satellite setup, exports the offline map, and persists dark mode", async ({ page }) => {
  await page.goto("/map?region=PR");
  await page.getByRole("combobox", { name: "Map layer" }).selectOption("satellite");
  await expect(page.getByText("Satellite imagery requires a licensed tile provider.")).toBeVisible();
  const imageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  expect((await imageDownload).suggestedFilename()).toBe("stateatlas-map.png");
  await page.getByRole("button", { name: "Toggle light or dark theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
