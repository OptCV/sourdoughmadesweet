import { z } from "zod";
import type { Category } from "./contracts";

export const navigationInput = z.object({
  menuLabel: z.string().trim().min(1).max(24).default("Our menu"),
  shortcutCategoryIds: z
    .array(z.uuid())
    .max(2)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Choose each shortcut only once.",
    )
    .default([]),
});
export type NavigationSettings = z.infer<typeof navigationInput>;
export function navigationCategories(categories: Category[]) {
  return categories
    .filter((c) => c.isActive)
    .slice()
    .sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
}
export function navigationShortcuts(
  categories: Category[],
  settings: NavigationSettings,
) {
  return settings.shortcutCategoryIds.flatMap((id) => {
    const category = categories.find((c) => c.id === id && c.isActive);
    return category ? [category] : [];
  });
}
