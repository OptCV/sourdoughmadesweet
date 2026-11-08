import { z } from "zod";

export const hexColor = z
  .string()
  .regex(
    /^#[0-9a-fA-F]{6}$/,
    "Use a six-digit hex color, for example #452920.",
  );
export const sectionStyleSchema = z.object({
  backgroundColor: hexColor.nullable().default(null),
  backgroundImageId: z.uuid().nullable().default(null),
});
export const appearanceSchema = z.object({
  background: hexColor.default("#FFFCED"),
  primary: hexColor.default("#452920"),
  accent: hexColor.default("#D59D54"),
  heroHeading: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .default("Sourdough Bread & Sweets Made Fresh"),
  heroSubheading: z
    .string()
    .trim()
    .max(600)
    .default(
      "Welcome to our cottage food bakery. Guaranteed Fresh Sourdough Breads & Sweets made to Order",
    ),
  heroEyebrow: z.string().trim().max(100).default("HANDCRAFTED WITH LOVE"),
  heroBackground: sectionStyleSchema.default({
    backgroundColor: null,
    backgroundImageId: null,
  }),
});
export type Appearance = z.infer<typeof appearanceSchema>;
export type SectionStyle = z.infer<typeof sectionStyleSchema>;
export const defaultAppearance = appearanceSchema.parse({});
function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function luminance(hex: string) {
  return rgb(hex)
    .map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readableText(background: string, preferred: string) {
  return contrast(background, preferred) >= 4.5
    ? preferred
    : contrast(background, "#000000") >= contrast(background, "#FFFFFF")
      ? "#000000"
      : "#FFFFFF";
}
export function mix(a: string, b: string, weight: number) {
  const x = rgb(a),
    y = rgb(b);
  return (
    "#" +
    x
      .map((v, i) =>
        Math.round(v * (1 - weight) + y[i] * weight)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function brandVariables(a: Appearance): Record<string, string> {
  const text = readableText(a.background, a.primary);
  const surface = mix(a.background, text, 0.06);
  const hover = mix(a.primary, readableText(a.primary, a.background), 0.08);
  return {
    "--color-cream": a.background,
    "--color-chocolate": a.primary,
    "--color-gold": a.accent,
    "--page-text": text,
    "--on-primary": readableText(a.primary, a.background),
    "--on-accent": readableText(a.accent, a.primary),
    "--on-hover": readableText(hover, a.background),
    "--surface": surface,
    "--surface-text": readableText(surface, text),
    "--muted": readableText(a.background, mix(a.background, text, 0.78)),
    "--border": mix(a.background, text, 0.3),
    "--control-border": text,
    "--hover": hover,
  };
}
export function sectionVariables(
  a: Appearance,
  theme: "cream" | "chocolate" | "gold",
  style?: SectionStyle | null,
): Record<string, string> {
  const background =
    style?.backgroundColor ??
    { cream: a.background, chocolate: a.primary, gold: a.accent }[theme];
  const foreground = readableText(background, a.primary);
  return {
    "--section-bg": background,
    "--section-fg": foreground,
    ...(style?.backgroundImageId
      ? { backgroundImage: `url("/api/media/${style.backgroundImageId}")` }
      : {}),
  };
}
