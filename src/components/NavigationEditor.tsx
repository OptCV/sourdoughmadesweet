import type { Category } from "../../shared/contracts";
import {
  navigationInput,
  navigationCategories,
  type NavigationSettings,
} from "../../shared/navigation";

export function NavigationEditor({
  value,
  categories,
  onChange,
}: {
  value?: NavigationSettings;
  categories: Category[];
  onChange: (value: NavigationSettings) => void;
}) {
  const settings = value ?? navigationInput.parse({});
  const active = navigationCategories(categories);
  return (
    <fieldset className="navigation-editor">
      <legend>Navigation</legend>
      <p>
        Every active category appears automatically in the menu, in its catalog
        display order. New categories need no extra setup. Archive or deactivate
        a category to remove it.
      </p>
      <label>
        Menu button label
        <input
          required
          maxLength={24}
          value={settings.menuLabel}
          onChange={(e) => onChange({ ...settings, menuLabel: e.target.value })}
        />
      </label>
      <fieldset>
        <legend>Desktop category shortcuts (optional)</legend>
        <p className="muted">
          Choose up to two favorites to place beside the menu on wide screens.
          All categories remain available in the menu. On phones, customers see
          one simple category list.
        </p>
        {active.map((c) => (
          <label className="checkbox" key={c.id}>
            <input
              type="checkbox"
              checked={settings.shortcutCategoryIds.includes(c.id)}
              disabled={
                !settings.shortcutCategoryIds.includes(c.id) &&
                settings.shortcutCategoryIds.length >= 2
              }
              onChange={(e) =>
                onChange({
                  ...settings,
                  shortcutCategoryIds: e.target.checked
                    ? [...settings.shortcutCategoryIds, c.id]
                    : settings.shortcutCategoryIds.filter((id) => id !== c.id),
                })
              }
            />
            {c.name}
          </label>
        ))}
        {settings.shortcutCategoryIds.some(
          (id) => !active.some((c) => c.id === id),
        ) && (
          <p className="muted">
            A saved shortcut is inactive or archived. It will not appear to
            customers.
          </p>
        )}
        <button
          type="button"
          onClick={() => onChange({ ...settings, shortcutCategoryIds: [] })}
        >
          Clear shortcuts
        </button>
      </fieldset>
    </fieldset>
  );
}
