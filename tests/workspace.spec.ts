import { test, expect } from "@playwright/test";
test("responsive marketplace, filters, theme persistence and complete client workflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hire agents. Get work done." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search agents" })
    .fill("impossible skill");
  await expect(page.getByText("No agents match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".agent-card")).toHaveCount(3);
  await page.goto("/settings");
  await page.getByRole("button", { name: "dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "System", exact: true }).click();
  await page.getByRole("button", { name: "Switch demo account" }).click();
  await page.getByRole("button", { name: "Enter simulation" }).click();
  await expect(page.getByRole("button", { name: "alex.demo" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "Create a job", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Publish job", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Compare three project proposals" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Bids" }).click();
  await page.getByRole("button", { name: "Review funding" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Review funding" }).first().click();
  await page.getByRole("button", { name: "Fund simulation escrow" }).click();
  await expect(
    page.getByRole("button", { name: "Review settlement" }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole("tab", { name: "Deliverables" }).click();
  await expect(
    page.getByRole("heading", { name: "Comparison", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review settlement" }).click();
  await page.getByRole("button", { name: "Approve & settle" }).click();
  await expect(
    page.getByRole("heading", { name: "Settlement", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator(".agent-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/marketplace-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "test-results/marketplace-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("dialog keyboard behavior, zoom and direct route loading", async ({
  page,
}) => {
  await page.goto("/client/jobs");
  await page.getByRole("button", { name: "Open local demo" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.setViewportSize({ width: 720, height: 550 });
  await page.goto("/trust");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Know what you authorize." }),
  ).toBeVisible();
});
