# The Modern Artisan Bakehouse

“A thoughtfully crafted digital storefront inspired by warm kitchens, fresh sourdough, rustic baking traditions, and understated boutique elegance.”

## Philosophy

Rustic warmth comes from cream paper, natural textures and quiet hospitality. Editorial sophistication comes from oversized serif typography, asymmetry and strong whitespace. Minimalism makes ordering straightforward; authentic photography tells the product story. Handmade does not mean messy. Reject generic SaaS aesthetics, colorful gradients, neon, glassmorphism, heavy shadows, crowded layouts, stock commerce templates and excessive illustrations.

## Color system

The original cream, chocolate and gold values below are **defaults**, not restrictions. The owner can replace all three with any six-digit hex colors in Settings → Brand & hero. The saved PostgreSQL configuration is the source of truth; existing stores without appearance settings retain these defaults.

```css
:root {
  --color-cream: #fffced;
  --color-chocolate: #452920;
  --color-gold: #d59d54;
  --surface: #f5efdf;
  --text-muted: #725b4e;
  --border: #d9ccb7;
  --hover: #603c2e;
  --success: #28553c;
  --error: #9b3028;
}
```

Page and primary surfaces are cream. Secondary surfaces use pale oatmeal. Chocolate is primary text, filled button and footer. Muted brown is secondary text on cream. Gold is decoration and flight background, never small text on cream. Gold surfaces use chocolate text. Inverse surfaces use cream text and pale oatmeal secondary text. Borders divide sections without heavy cards. Primary buttons are chocolate/cream; inverse buttons cream/chocolate; outline buttons use currentColor. Hover darkens chocolate or underlines links. Focus uses a 3px chocolate outline with cream offset; dark areas use cream outlines. Success/error text uses the semantic dark colors on cream. Status meaning always has text, not only color. Check final computed color pairs for AA (4.5:1 body, 3:1 large text/control boundaries).

## Typography

Cormorant Garamond 400/500 is the display face; DM Sans 400/500/600 is functional text. Self-host font files through Fontsource. Hero: clamp(3.4rem,7vw,6rem), line-height .98, slight negative tracking. H2: clamp(2.8rem,5vw,4.5rem), line-height 1.05. H3: 1.8–2.25rem. Body: 1rem–1.125rem, line-height 1.65. Product names: DM Sans 1.125rem/1.4 medium. Prices: tabular numerals, 1rem semibold. Form labels and buttons: .875rem medium, no forced uppercase. Eyebrows/captions: .7rem, .16em tracking, uppercase for decorative eyebrows only. Never clip long names; controls wrap or stack.

## Layout

Maximum content width 1240px. Container padding 24px mobile, 40px tablet, 64px wide. Spacing scale 4/8/12/16/24/32/48/64/96/128px. Sections use 96–112px vertical desktop and 64px mobile. Header is approximately 88px with scroll offset 108px. Product grids have 24–32px gaps, 4 columns desktop, 2 tablet and 1 narrow mobile. Main hero is an asymmetric two-column spread with a tall image. Reading lines remain below 70 characters.

## Components

- Navbar: cream, thin bottom rule, sticky, logo/text left; restrained links and filled CTA right. Mobile menu button is labeled, exposes expanded state, closes after selection. Touch targets at least 44px.
- Logo: preserve supplied proportions; maximum 190px wide. Until supplied, use an explicitly temporary plain business-name wordmark, never a fabricated SMS logo.
- Hero: eyebrow, expressive H1, readable subtitle and two wrapping CTAs. Editorial photography window has rounded upper corners and a thin gold outline; pending photography is clearly labeled.
- Buttons: minimum 44px high, 12px 22px padding, 4px radius, 180ms transition. Disabled opacity .55 plus disabled semantics. Loading text explains progress.
- Category headings: large serif, small section number and thin rule. Descriptions align beside headings on wide screens.
- Product cards: borderless, square images, no shadow; 16px image-to-title spacing, description then compact variant selector and price/action row. Image hover scale no more than 1.025.
- Images: object-fit cover, consistent 1:1 crop. Pending media uses a neutral typographic placeholder; never broken img URLs.
- Selectors/inputs: 44px minimum, 12px padding, cream fill, visible brown boundary. Labels always visible. Error text beneath fields and aria-invalid where practical.
- Badges: small text pills, 6px 10px, high contrast; availability never conveyed only by hue.
- Flights: chocolate text on gold, checkable flavor tiles with pressed state, selected cream surface and check icon; visible progress, count and complete-selection instructions.
- Summary: oatmeal surface, 24px padding, line item image/name/variant, editable quantity, remove label and divider above subtotal. Sticky on desktop only.
- Order form: grouped customer/fulfillment/confirmation fields; two columns desktop, stacked mobile; radios use native accessible controls. Success announces reference without promising confirmation.
- Dialogs: native dialog or browser confirmation for archive actions; accessible label, focus retained, Escape closes. Alerts use role=status or alert, never a fleeting toast as sole error evidence.
- Footer: chocolate, cream brand and links, thin muted divider; warm closing text.
- Admin: chocolate sidebar/nav, cream workspace, modest serif titles. Data tables have readable headers and horizontal scroll only within their container. Forms use the same controls with fieldsets and clear save/cancel actions. Destructive actions require confirmation.

## Art direction

Hero is spacious cream with chocolate display text and restrained gold linework. Breads stays airy cream with a thin divider and image-led grid. Sweet Treats is a full chocolate section with cream text and rich imagery. Cookie Flights is full gold and interactive but simple. Ordering returns to calm cream. Footer closes in chocolate with “Made with love. Baked fresh. Shared with joy.” No fabricated geography, testimonials, hours or guarantees.

## Photography

Use authentic supplied product images in warm natural light. Neutral linen/stone, sourdough crust texture, rich cookie details, subtle shadows, consistent crop, no harsh filters. Do not enlarge menu thumbnails into hero images. Original logo and high-resolution photos were not supplied with the initial repository: use labeled temporary placeholders until owner uploads assets. The editorial hero photograph uses an owner-approved featured product photo. An optional decorative hero background can also be selected from the Media library.

## Motion

Smooth anchors, gentle underline/button transitions and selection feedback run 150–300ms. No parallax or delays. prefers-reduced-motion removes animation and smooth scrolling. Success feedback is stable text.

## Responsive behavior

- 360px: compact wordmark/menu, stacked hero/CTAs and form, one product column, no sticky summary.
- 390px: same structure with slightly wider gutters; full-width selectors and comfortable taps.
- 768px: two-column products, stacked hero or balanced compact split, two-column form fields.
- 1024px: desktop nav, two-column hero, three-column products, two-column checkout.
- 1440px: centered 1240px content, four-column products, full display typography and generous section space.
  The editorial hero photo remains a contained crop. Optional decorative section backgrounds use cover/center cropping behind solid content panels. Nav and buttons never cause horizontal scroll.

## Accessibility

Semantic landmarks, one H1, sequential headings, skip link, keyboard-complete actions, visible focus, meaningful alt text, empty alt for decorative images. Native labels/radios/selects, descriptive validation, live status messages, adequate touch targets. Check AA contrast and keyboard flow at all breakpoints. Respect reduced motion.

## Acceptance checklist

- [ ] Saved owner palette and hero copy applied; original defaults used for older settings
- [ ] Editorial typography and clear hierarchy
- [ ] Inherited page / primary / accent section rhythm, with deliberate owner overrides
- [ ] Authentic imagery or explicitly temporary placeholders
- [ ] No invented logo, geography or business claims
- [ ] Database-driven category/product content
- [ ] Clear request-not-confirmation messaging
- [ ] All controls keyboard accessible with visible focus
- [ ] No overflow at 360/390/768/1024/1440px
- [ ] Owner interface consistent and understandable

## Owner customization and unified branding

### Shared palette

Settings → Brand & hero controls the page background, primary brand color and accent color with labeled color pickers and hex inputs. The full RGB hex range is accepted, including dark page backgrounds. These changes propagate to the storefront, navigation, buttons, forms, product placeholders, order summary, footer, login and owner dashboard. Derived surfaces, dividers, muted text and hover colors follow the shared palette rather than fixed bakery colors. Status colors retain their semantic meaning on explicit high-contrast surfaces.

The legacy CSS variables --color-cream, --color-chocolate and --color-gold now represent the page, primary and accent slots; their names do not constrain saved colors. shared/appearance.ts owns defaults, validation, contrast calculations and derived variables. Do not introduce fixed decorative colors in individual components. Saved changes apply together after Save settings; editing a draft affects only the inline preview. Public catalog caching may take up to 30 seconds to refresh on a new page load.

### Hero content and background

The owner controls the heading (required, up to 160 characters), subheading (optional, 600 characters) and eyebrow (optional, 100 characters). Empty optional copy is omitted. Text is rendered as plain React text, never HTML. Headings may wrap and preserve line breaks; long unbroken text must not overflow on mobile. The original copy remains the default, but exact original wording is no longer a design acceptance requirement.

The hero inherits the page background by default. Owners can enable a custom hex background color, select an uploaded R2 image, combine both, or remove the image. Background photos are decorative, cover the section with centered cropping and sit behind a solid content panel in the selected/inherited color. This preserves readability regardless of image brightness. The editorial product photograph remains separate. Use authentic owner-approved assets; upload them in Media before selecting them as backgrounds.

### Category backgrounds

Category editing offers Page background, Primary brand color and Accent brand color inheritance (stored using the existing cream/chocolate/gold keys for compatibility). It also offers any custom hex color and an optional Media-library background image. Inherited colors change with the global palette; explicit overrides remain independent until the owner turns off Use a custom background color. Category content panels follow the same readability treatment as the hero. Choosing No image returns to a color-only background. Existing category ordering, copy, availability and catalog data remain independent of these visual controls.

### Readability and interaction

Foreground text is selected automatically: use the preferred brand pairing when it reaches WCAG AA 4.5:1; otherwise choose black or white based on contrast. The owner can choose any background without being asked to calculate contrast. Form inputs use the page surface and readable text, while selected flavor tiles use the shared page surface with its corresponding foreground. Focus indicators remain visible. Background panels are opaque; opacity effects must not undermine computed foreground contrast. Review 360, 390, 768, 1024 and 1440px layouts when typography or content lengths change.

### Dashboard workflow and persistence

The settings editor provides an unsaved hero/palette preview and a confirmed Restore original brand & hero action. Restore changes the draft only; Save settings publishes it. Business settings and appearance save together. Category overrides save with the category. Server-side schemas accept only hex colors, bounded plain text and UUID image references—never arbitrary CSS, HTML or external image URLs. Images must exist in the authenticated Media library. Deletion is blocked while any category (including archived categories), product or hero still references the asset; detach it first.

The additive category style migration must be applied before deploying this feature. Hero and global palette data live in the existing business_settings JSON record. No reseeding or destructive reset is required. Older settings remain valid, and older business-settings clients cannot erase an existing appearance configuration simply by omitting it.

### Customization acceptance

- [ ] Owner can edit hero heading, subheading and eyebrow and see the saved text publicly.
- [ ] Any valid hex palette propagates consistently through the public site and dashboard.
- [ ] Categories follow the shared palette unless deliberately overridden.
- [ ] Hero/category image backgrounds retain readable content on mobile and desktop.
- [ ] Invalid colors and nonexistent media references are rejected server-side.
- [ ] Referenced background images cannot be deleted.
- [ ] Draft preview, save errors and restore-default behavior are clear.
