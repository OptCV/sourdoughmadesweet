import { describe, it, expect } from "vitest";
import {
  navigationInput,
  navigationCategories,
  navigationShortcuts,
} from "../shared/navigation";
import { categoryInput, settingsInput } from "../shared/contracts";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const cats = [
  {
    id: id(1),
    ...categoryInput.parse({
      name: "Seasonal specials",
      slug: "seasonal",
      theme: "cream",
      displayOrder: 2,
    }),
  },
  {
    id: id(2),
    ...categoryInput.parse({
      name: "Breads",
      slug: "breads",
      theme: "cream",
      displayOrder: 1,
    }),
  },
  {
    id: id(3),
    ...categoryInput.parse({
      name: "Archived",
      slug: "archived",
      theme: "cream",
      isActive: false,
    }),
  },
];
describe("catalog navigation", () => {
  it("automatically includes new active categories in display order", () =>
    expect(navigationCategories(cats).map((c) => c.slug)).toEqual([
      "breads",
      "seasonal",
    ]));
  it("keeps archived and removed shortcuts out of the navigation", () =>
    expect(
      navigationShortcuts(cats, {
        menuLabel: "Our menu",
        shortcutCategoryIds: [id(3), id(99)],
      }),
    ).toEqual([]));
  it("respects selected shortcut order without mutating catalog order", () => {
    expect(
      navigationShortcuts(cats, {
        menuLabel: "Explore",
        shortcutCategoryIds: [id(1), id(2)],
      }).map((c) => c.slug),
    ).toEqual(["seasonal", "breads"]);
    expect(cats[0].slug).toBe("seasonal");
  });
  it("defaults older settings to an automatic menu and bounds owner input", () => {
    expect(navigationInput.parse({})).toEqual({
      menuLabel: "Our menu",
      shortcutCategoryIds: [],
    });
    for (const value of [
      { menuLabel: "" },
      { menuLabel: "x".repeat(25) },
      { shortcutCategoryIds: [id(1), id(1)] },
      { shortcutCategoryIds: [id(1), id(2), id(3)] },
    ])
      expect(navigationInput.safeParse(value).success).toBe(false);
    expect(settingsInput.shape.navigation.safeParse(undefined).success).toBe(
      true,
    );
  });
});
