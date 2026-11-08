import type { CSSProperties } from "react";
import {
  appearanceSchema,
  brandVariables,
  sectionVariables,
  defaultAppearance,
  type Appearance,
  type SectionStyle,
} from "../../shared/appearance";

type ImageChoice = { id: string; filename: string };
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="color-field">
      <label>
        {label}
        <input
          aria-label={`${label} hex`}
          value={value}
          pattern="#[0-9a-fA-F]{6}"
          maxLength={7}
          required
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <input
        aria-label={`${label} color picker`}
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function BackgroundEditor({
  value,
  onChange,
  media,
  fallback,
}: {
  value?: SectionStyle | null;
  onChange: (value: SectionStyle) => void;
  media: ImageChoice[];
  fallback: string;
}) {
  const style = value ?? { backgroundColor: null, backgroundImageId: null };
  return (
    <fieldset className="background-editor">
      <legend>Section background</legend>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={style.backgroundColor !== null}
          onChange={(e) =>
            onChange({
              ...style,
              backgroundColor: e.target.checked ? fallback : null,
            })
          }
        />{" "}
        Use a custom background color
      </label>
      {style.backgroundColor !== null && (
        <ColorField
          label="Background color"
          value={style.backgroundColor}
          onChange={(backgroundColor) =>
            onChange({ ...style, backgroundColor })
          }
        />
      )}
      <label>
        Background image
        <select
          value={style.backgroundImageId ?? ""}
          onChange={(e) =>
            onChange({ ...style, backgroundImageId: e.target.value || null })
          }
        >
          <option value="">No image — use color only</option>
          {media.map((m) => (
            <option key={m.id} value={m.id}>
              {m.filename}
            </option>
          ))}
        </select>
      </label>
      <small>
        Upload photographs in Media first. Content stays on a solid panel for
        readability. Turn off the custom color to follow the brand palette.
      </small>
      {style.backgroundImageId && (
        <img
          className="upload-preview"
          src={`/api/media/${style.backgroundImageId}`}
          alt="Selected section background preview"
        />
      )}
    </fieldset>
  );
}
export function AppearanceEditor({
  value,
  onChange,
  media,
}: {
  value?: Appearance;
  onChange: (value: Appearance) => void;
  media: ImageChoice[];
}) {
  const a = value ?? defaultAppearance;
  const preview = appearanceSchema.safeParse(a);
  return (
    <fieldset className="appearance-editor">
      <legend>Brand & hero</legend>
      <p>
        Change the shared palette here to update the storefront and owner
        dashboard together. Categories can inherit these colors or use their own
        backgrounds.
      </p>
      <div className="form-grid">
        {(
          [
            ["background", "Page background"],
            ["primary", "Primary brand color"],
            ["accent", "Accent brand color"],
          ] as const
        ).map(([key, label]) => (
          <ColorField
            key={key}
            label={label}
            value={a[key]}
            onChange={(color) => onChange({ ...a, [key]: color })}
          />
        ))}
      </div>
      <p className="muted">
        Use any hex color. Text automatically switches to a readable color when
        the selected pairing has insufficient contrast.
      </p>
      <label>
        Hero eyebrow
        <input
          maxLength={100}
          value={a.heroEyebrow}
          onChange={(e) => onChange({ ...a, heroEyebrow: e.target.value })}
        />
      </label>
      <label>
        Hero heading
        <textarea
          required
          maxLength={160}
          value={a.heroHeading}
          onChange={(e) => onChange({ ...a, heroHeading: e.target.value })}
        />
      </label>
      <label>
        Hero subheading
        <textarea
          maxLength={600}
          value={a.heroSubheading}
          onChange={(e) => onChange({ ...a, heroSubheading: e.target.value })}
        />
      </label>
      <BackgroundEditor
        value={a.heroBackground}
        media={media}
        fallback={
          /^#[0-9a-f]{6}$/i.test(a.background)
            ? a.background
            : defaultAppearance.background
        }
        onChange={(heroBackground) => onChange({ ...a, heroBackground })}
      />
      {preview.success && (
        <div
          className="brand-preview"
          style={brandVariables(preview.data) as CSSProperties}
        >
          <small>Unsaved preview</small>
          <div
            className={`custom-section ${a.heroBackground.backgroundImageId ? "has-background-image" : ""}`}
            style={
              sectionVariables(
                preview.data,
                "cream",
                a.heroBackground,
              ) as CSSProperties
            }
          >
            <div className="section-content">
              <span className="eyebrow">{a.heroEyebrow}</span>
              <h2>{a.heroHeading}</h2>
              <p>{a.heroSubheading}</p>
              <span className="button">Request an Order</span>
            </div>
          </div>
          <div className="palette-preview">
            <span style={{ background: a.primary, color: "var(--on-primary)" }}>
              Primary section
            </span>
            <span style={{ background: a.accent, color: "var(--on-accent)" }}>
              Accent section
            </span>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          if (
            confirm(
              "Restore the original brand colors and hero content in this draft? Save settings to publish the change.",
            )
          )
            onChange(structuredClone(defaultAppearance));
        }}
      >
        Restore original brand & hero
      </button>
    </fieldset>
  );
}
