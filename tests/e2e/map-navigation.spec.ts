import { expect, test } from "@playwright/test";

for (const [route, label] of [
  ["/", "North America boundary map"],
  ["/creator", "North America boundary map"],
  ["/map", "Map of U.S. states and territories"],
  ["/creator?scope=us", "Map of U.S. states and territories"],
  ["/compare-size", "Same-scale state outlines"],
]) {
  test(`pans, zooms at the cursor and resets without editing the map: ${route}`, async ({ page }) => {
    await page.goto(route);
    const map = page.getByRole("group", { name: label, exact: true });
    await expect(map).toHaveClass(/navigable-map/);
    if (route === "/compare-size") await expect(map.locator(".size-base-outline")).toBeVisible();
    await map.scrollIntoViewIfNeeded();
    const initial = await map.getAttribute("viewBox");
    const fills = await map.locator("path[fill]").evaluateAll((paths) => paths.map((path) => path.getAttribute("fill")));
    const selection = await map.locator('[aria-pressed="true"]').count();
    const box = (await map.boundingBox())!;
    const dragX = box.x + Math.max(70, box.width * 0.12);
    // An empty area also pans; in size comparison this moves both states.
    await page.mouse.move(dragX, box.y + box.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(dragX + 55, box.y + box.height * 0.6 + 25, { steps: 8 });
    await page.mouse.up();
    await expect(map).not.toHaveAttribute("viewBox", initial!);
    expect(await map.locator("path[fill]").evaluateAll((paths) => paths.map((path) => path.getAttribute("fill")))).toEqual(fills);
    expect(await map.locator('[aria-pressed="true"]').count()).toBe(selection);

    await map.focus();
    // Browser wheel events use integer CSS pixel coordinates.
    const cursor = { x: Math.floor(box.x + box.width * 0.55), y: Math.floor(box.y + box.height * 0.45) };
    const worldPoint = () => map.evaluate((element, cursor) => {
      const point = new DOMPoint(cursor.x, cursor.y).matrixTransform((element as SVGSVGElement).getScreenCTM()!.inverse());
      return { x: point.x, y: point.y };
    }, cursor);
    const anchored = await worldPoint();
    await page.mouse.move(cursor.x, cursor.y);
    await page.mouse.wheel(0, -120);
    await expect.poll(async () => Number(await map.getAttribute("data-zoom"))).toBeGreaterThan(1.1);
    await expect(map).not.toHaveAttribute("data-navigating", "true");
    const after = await worldPoint();
    const pixelsPerUnit = await map.evaluate((element) => (element as SVGSVGElement).getScreenCTM()!.a);
    expect(Math.abs(after.x - anchored.x) * pixelsPerUnit).toBeLessThan(1);
    expect(Math.abs(after.y - anchored.y) * pixelsPerUnit).toBeLessThan(1);

    await map.press("Home");
    await expect(map).toHaveAttribute("viewBox", initial!);
    await map.press("+");
    await expect.poll(async () => Number(await map.getAttribute("data-zoom"))).toBeGreaterThan(1.3);
    await expect(map).not.toHaveAttribute("data-navigating", "true");
    const zoomed = await map.getAttribute("viewBox");
    await map.press("ArrowRight");
    await expect(map).not.toHaveAttribute("viewBox", zoomed!);
    await map.press("0");
    await expect(map).toHaveAttribute("viewBox", initial!);
  });
}

test("pinches dense local boundaries and preserves the view through fullscreen", async ({ page, context }) => {
  await page.goto("/?places=can");
  await page.getByLabel("Boundary level").selectOption("3");
  const map = page.getByRole("group", { name: "North America boundary map" });
  await expect(map.locator('[role="button"]')).toHaveCount(5163);
  await page.getByRole("button", { name: "Enter fullscreen preview" }).click();
  const box = (await map.boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const session = await context.newCDPSession(page);
  const touches = (spread: number) => [
    { x: center.x - spread, y: center.y, id: 1 },
    { x: center.x + spread, y: center.y, id: 2 },
  ];
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touches(35) });
  for (const spread of [45, 55, 65, 75]) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touches(spread) });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => Number(await map.getAttribute("data-zoom"))).toBeGreaterThan(1.8);
  const zoomed = await map.getAttribute("viewBox");
  await page.getByRole("button", { name: "Exit fullscreen preview" }).press("Escape");
  await expect(map).toHaveAttribute("viewBox", zoomed!);
  await page.getByRole("button", { name: "Reset zoom" }).click();
  await expect.poll(async () => Number(await map.getAttribute("data-zoom"))).toBeCloseTo(1, 5);
  await session.detach();
});

test("dragging across a country never paints it, but a click does", async ({ page }) => {
  await page.goto("/creator?places=can");
  const map = page.getByRole("group", { name: "North America boundary map" });
  const canada = map.getByRole("button", { name: "Canada", exact: true });
  const shape = canada.locator("path");
  const original = await shape.getAttribute("fill");
  await canada.locator("path").scrollIntoViewIfNeeded();
  const box = (await shape.boundingBox())!;
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.7;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 70, y + 30, { steps: 10 });
  await page.mouse.up();
  await expect(shape).toHaveAttribute("fill", original!);
  await canada.press("Enter");
  await expect(shape).not.toHaveAttribute("fill", original!);
  await page.getByRole("button", { name: "Reset zoom" }).click();
  await expect(map).not.toHaveAttribute("data-navigating", "true");
  await expect(shape).not.toHaveAttribute("fill", original!);
});

test("keeps zoom bounded and supports reduced-motion controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const map = page.getByRole("group", { name: "North America boundary map" });
  await expect(map).toHaveClass(/navigable-map/);
  const initial = await map.getAttribute("viewBox");
  await map.focus();
  for (let i = 0; i < 12; i++) await map.press("+");
  expect(Number(await map.getAttribute("data-zoom"))).toBeCloseTo(16, 5);
  await expect(map).not.toHaveAttribute("data-navigating", "true");
  for (let i = 0; i < 14; i++) await map.press("-");
  expect(Number(await map.getAttribute("data-zoom"))).toBeCloseTo(1, 5);
  await map.press("Home");
  await expect(map).toHaveAttribute("viewBox", initial!);
});
