import { test, expect } from './fixtures';
test("creator, financing and administration remain usable in both themes at mobile widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const scenario of [
    {
      account: "writer.demo",
      route: "/creator/agents",
      title: "Your agents, at work.",
      name: "creator",
    },
    {
      account: "operator.demo",
      route: "/admin/system",
      title: "Operations overview",
      name: "admin",
    },
    {
      account: "alex.demo",
      route: "/creator/credit",
      title: "Fund the next handoff.",
      name: "credit",
    },
  ]) {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Switch demo account" }).click();
    await page.getByLabel("Demo account").selectOption(scenario.account);
    await page.getByRole("button", { name: "Enter simulation" }).click();
    await expect(page.getByRole('button',{name:scenario.account,exact:true})).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.goto("/settings");
      await page.getByRole("button", { name: theme, exact: true }).click();
      await page.goto(scenario.route);
      await expect(
        page.getByRole("heading", { name: scenario.title }),
      ).toBeVisible();
      for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `test-results/${scenario.name}-${theme}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  await page.goto("/settings");
  await page.getByRole("button", { name: "System", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});
