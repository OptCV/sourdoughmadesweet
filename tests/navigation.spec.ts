import { test, expect } from "@playwright/test";
const categories = Array.from({ length: 18 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  name:
    i === 0
      ? "Seasonal specials & freshly baked favorites for sharing"
      : `Bakery collection ${i + 1}`,
  slug: `collection-${i + 1}`,
  theme: "cream",
  description: "",
  displayOrder: i,
  isActive: true,
}));
const settings = {
  displayName: "Bakery",
  contactEmail: "",
  contactPhone: "",
  pickupEnabled: true,
  deliveryEnabled: false,
  orderingInstructions: "",
  leadTimeGuidance: "",
  announcement: "",
  navigation: {
    menuLabel: "Explore the menu",
    shortcutCategoryIds: categories.slice(0, 2).map((c) => c.id),
  },
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/catalog", (r) =>
    r.fulfill({ json: { settings, categories, products: [], flights: [] } }),
  );
});
test("desktop menu includes every category without growing the header", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const toggle = page.getByRole("button", {
    name: "Explore the menu",
    exact: true,
  });
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeHidden();
  await expect(page.locator(".category-shortcuts a")).toHaveCount(2);
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#desktop-category-links a")).toHaveCount(18);
  await page.keyboard.press("Tab");
  await expect(page.locator("#desktop-category-links a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page.locator("h1").click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page.locator("#desktop-category-links a").last().click();
  await expect(page).toHaveURL(/#collection-18$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  for (const width of [768, 1024, 1100, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole("link", { name: "Explore Our Menu", exact: true }),
  ).toHaveAttribute("href", "#collection-1");
});
test("phone navigation stays flat, scrolls, closes on selection and resets at desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await expect(toggle).toBeVisible();
  await expect(page.locator(".desktop-navigation")).toBeHidden();
  await toggle.click();
  const panel = page.locator("#mobile-category-links");
  await expect(panel.locator("ul a")).toHaveCount(18);
  await expect(panel).toHaveCSS("overflow-y", "auto");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(panel).toBeHidden();
  await toggle.click();
  await panel.locator("ul a").last().click();
  await expect(panel).toBeHidden();
  await expect(page.locator("#collection-18")).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await toggle.click();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(panel).toBeHidden();
  await expect(page.locator(".mobile-toggle")).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
