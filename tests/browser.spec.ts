import { test, expect } from "@playwright/test";
import { defaultAppearance } from "../shared/appearance";
test("owner can edit and save centralized brand and hero controls", async ({
  page,
}) => {
  let settings = {
    displayName: "Bakery",
    contactEmail: "",
    contactPhone: "",
    pickupEnabled: true,
    deliveryEnabled: true,
    orderingInstructions: "",
    leadTimeGuidance: "",
    announcement: "",
    appearance: defaultAppearance,
    navigation: { menuLabel: "Our menu", shortcutCategoryIds: [] },
  };
  await page.route("**/api/admin/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/settings") && route.request().method() === "PATCH") {
      settings = route.request().postDataJSON();
      await route.fulfill({ json: settings });
    } else if (path.endsWith("/catalog"))
      await route.fulfill({
        json: { settings, categories: [], products: [], flights: [] },
      });
    else await route.fulfill({ json: [] });
  });
  await page.goto("/admin");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Menu button label", { exact: true })
    .fill("Browse our bakes");
  await page
    .getByRole("textbox", { name: "Hero heading", exact: true })
    .fill("Your neighborhood bakehouse");
  await page
    .getByLabel("Primary brand color hex", { exact: true })
    .fill("#123456");
  await expect(
    page.getByRole("heading", { name: "Your neighborhood bakehouse" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved successfully.");
  expect(settings.appearance.heroHeading).toBe("Your neighborhood bakehouse");
  expect(settings.appearance.primary).toBe("#123456");
  expect(settings.navigation.menuLabel).toBe("Browse our bakes");
  await expect(page.locator(".admin-nav")).toHaveCSS(
    "background-color",
    "rgb(18, 52, 86)",
  );
});
test("saved brand and hero settings render across responsive storefront sections", async ({
  page,
}) => {
  const settings = {
    displayName: "Bakery",
    contactEmail: "",
    contactPhone: "",
    pickupEnabled: true,
    deliveryEnabled: false,
    orderingInstructions: "",
    leadTimeGuidance: "",
    announcement: "",
    appearance: {
      ...defaultAppearance,
      background: "#F0F5FF",
      primary: "#123456",
      accent: "#BBDDEE",
      heroHeading: "Fresh ideas, fresh bread",
      heroEyebrow: "OUR NEW LOOK",
      heroSubheading: "Made for our community",
    },
  };
  const catalog = {
    settings,
    categories: [
      {
        id: "category",
        name: "Breads",
        slug: "breads",
        theme: "gold",
        description: "",
        displayOrder: 0,
        isActive: true,
        style: { backgroundColor: "#DDEEFF", backgroundImageId: null },
      },
    ],
    products: [],
    flights: [],
  };
  await page.route("**/api/catalog", (r) => r.fulfill({ json: catalog }));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    settings.appearance.heroHeading,
  );
  await expect(page.locator("#home .eyebrow")).toHaveText("OUR NEW LOOK");
  await expect(page.locator(".header")).toHaveCSS(
    "background-color",
    "rgb(240, 245, 255)",
  );
  await expect(page.locator(".footer")).toHaveCSS(
    "background-color",
    "rgb(18, 52, 86)",
  );
  await expect(page.locator("#breads")).toHaveCSS(
    "background-color",
    "rgb(221, 238, 255)",
  );
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("landing shell, navigation and unavailable-service state remain usable", async ({
  page,
}) => {
  await page.route("**/api/catalog", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unavailable" }),
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sourdough Bread & Sweets Made Fresh",
  );
  await expect(
    page.getByRole("heading", { name: "Our menu will be back soon." }),
  ).toBeVisible();
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
});
test("login fields have accessible labels", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
