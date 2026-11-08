import { z } from "zod";
import { navigationInput } from "./navigation";
import { appearanceSchema, sectionStyleSchema } from "./appearance";
export const availability = z.enum([
  "available",
  "sold_out",
  "coming_soon",
  "hidden",
]);
const name = z.string().trim().min(1).max(150);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(160);
export const categoryInput = z.object({
  name,
  slug,
  description: z.string().max(1000).default(""),
  theme: z.enum(["cream", "chocolate", "gold"]),
  style: sectionStyleSchema.nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export const variantInput = z.object({
  id: z.string().uuid().optional(),
  name,
  unitCount: z.number().int().min(1).max(1000),
  priceCents: z.number().int().min(0).max(1000000),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});
export const productInput = z.object({
  name,
  slug,
  categoryId: z.string().uuid(),
  description: z.string().max(2000).default(""),
  primaryImageId: z.string().uuid().nullable().default(null),
  additionalImageIds: z.array(z.string().uuid()).max(8).default([]),
  ingredients: z.string().max(2000).default(""),
  allergens: z.string().max(1000).default(""),
  availabilityStatus: availability,
  isFeatured: z.boolean().default(false),
  isCookieFlavor: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  variants: z.array(variantInput).max(20),
});
export const flightInput = z.object({
  productId: z.string().uuid(),
  requiredFlavorCount: z.number().int().min(1).max(12),
  priceCents: z.number().int().min(0).max(100000),
  isActive: z.boolean(),
  eligibleProductIds: z.array(z.string().uuid()).max(40),
});
export const settingsInput = z.object({
  navigation: navigationInput.optional(),
  appearance: appearanceSchema.optional(),
  displayName: name,
  contactEmail: z.union([z.email(), z.literal("")]),
  contactPhone: z.string().max(40),
  pickupEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
  orderingInstructions: z.string().max(2000),
  leadTimeGuidance: z.string().max(500),
  announcement: z.string().max(500),
});
export const orderInput = z
  .object({
    idempotencyKey: z.string().uuid(),
    customerName: name,
    customerEmail: z.email().max(254),
    customerPhone: z.string().trim().min(7).max(40),
    customerType: z.enum(["new", "returning"]),
    preferredContactMethod: z.enum(["email", "phone", "either"]),
    fulfillmentMethod: z.enum(["pickup", "delivery"]),
    deliveryAddress: z.string().max(1000).default(""),
    deliveryNotes: z.string().max(1000).default(""),
    requestedDate: z.iso.date("Choose a valid date"),
    requestedTimeWindow: z.string().max(150).default(""),
    notes: z.string().max(2000).default(""),
    acknowledgment: z.literal(true),
    website: z.string().max(0).default(""),
    turnstileToken: z.string().max(2048).default(""),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          variantId: z.string().uuid().optional(),
          quantity: z.number().int().min(1).max(100),
          flavorIds: z.array(z.string().uuid()).max(12).optional(),
        }),
      )
      .min(1)
      .max(50),
  })
  .refine(
    (v) =>
      v.fulfillmentMethod !== "delivery" ||
      v.deliveryAddress.trim().length >= 10,
    {
      path: ["deliveryAddress"],
      message: "Please enter a complete delivery address.",
    },
  );
export const statuses = [
  "new",
  "contacted",
  "confirmed",
  "in_preparation",
  "ready",
  "completed",
  "cancelled",
] as const;
export type OrderInput = z.infer<typeof orderInput>;
export type Settings = z.infer<typeof settingsInput>;
export type Category = z.infer<typeof categoryInput> & { id: string };
export type Variant = z.infer<typeof variantInput> & { id: string };
export type Product = Omit<z.infer<typeof productInput>, "variants"> & {
  id: string;
  variants: Variant[];
  imageAlt?: string;
};
export type Flight = z.infer<typeof flightInput> & { id: string };
export type Catalog = {
  categories: Category[];
  products: Product[];
  flights: Flight[];
  settings: Settings;
};
export type CartItem = OrderInput["items"][number] & {
  key: string;
  name: string;
  variantName: string;
  unitPriceCents: number;
  imageId: string | null;
  flavorNames?: string[];
};
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
