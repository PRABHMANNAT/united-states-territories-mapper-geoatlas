// Capture real UI states for the feature tour. Start the app before running.
// ATLAS_SCREENSHOT_URL defaults to the standard dev port; channel is optional.
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch({ channel: process.env.STATEATLAS_E2E_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const base = process.env.ATLAS_SCREENSHOT_URL || "http://localhost:3000";
const directory = new URL("../docs/screenshots/", import.meta.url);
await mkdir(directory, { recursive: true });
const visit = async (path) => {
  await page.goto(new URL(path, base).href);
  await page.evaluate(() => document.fonts.ready);
};
const capture = async (name) => {
  await page.mouse.move(0, 0);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, directory)), animations: "disabled" });
  console.log(`Captured ${name}`);
};

try {
  await visit("/");
  await expect(page.getByRole("button", { name: "Canada", exact: true })).toBeVisible();
  await capture("northatlas-overview");

  await visit("/creator?places=usa,usa-ak,can-ab,can-yt");
  await page.getByLabel("Map title").fill("Across borders");
  for (const [name, color] of [["United States of America", "#677786"], ["Alaska", "#3157af"], ["Alberta", "#d97b24"], ["Yukon", "#3c8455"]]) {
    await page.getByLabel("Custom paint color").fill(color);
    await page.getByRole("button", { name, exact: true }).press("Enter");
  }
  await page.getByRole("heading", { name: "Across borders", exact: true }).click();
  await capture("northatlas-creator");

  await visit("/compare-size");
  const overlay = page.getByRole("group", { name: /^Move Alaska/ });
  await expect(overlay).toBeVisible();
  const handle = await overlay.locator("circle").boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 48, handle.y + handle.height / 2 - 25, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("heading", { name: "How big is your state?" }).click();
  await capture("state-size-overlay");

  await visit("/us");
  await expect(page.getByRole("group", { name: "Map of U.S. states and territories" })).toBeVisible();
  await capture("us-atlas");

  await visit("/?places=usa");
  await page.getByLabel("Boundary level").selectOption("2");
  await page.getByLabel("Show subdivision boundaries").check();
  await expect(page.locator(".continent-map [role=button]")).toHaveCount(3234);
  await page.getByLabel("Map labels").uncheck();
  await capture("us-county-boundaries");

  await visit("/?places=can");
  await page.getByLabel("Boundary level").selectOption("3");
  await page.getByLabel("Show subdivision boundaries").check();
  await expect(page.locator(".continent-map [role=button]")).toHaveCount(5163);
  await page.getByLabel("Map labels").uncheck();
  await capture("north-america-level-three");

  await visit("/regions/iowa");
  await page.getByRole("navigation", { name: "Region sections" }).getByRole("link", { name: "History", exact: true }).click();
  await expect(page.locator("#history .chapter-reading")).toContainText("Iowa");
  await page.locator("#history").evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "start" }));
  await capture("encyclopedia-history");
  await page.getByRole("navigation", { name: "Region sections" }).getByRole("link", { name: "Population", exact: true }).click();
  await expect(page.locator("#population meter")).toHaveCount(2);
  await page.locator("#population").evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "start" }));
  await capture("encyclopedia-demographics");

  await visit("/compare?regions=CA,TX,NY");
  await expect(page.getByRole("heading", { name: "Compare places" })).toBeVisible();
  await capture("compare-states");

  await visit("/quiz");
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.locator(".quiz-options button")).toHaveCount(4);
  await capture("geography-quiz");
} finally {
  await browser.close();
}
