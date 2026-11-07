import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Settings } from "../../shared/contracts";
const id = () => uuid("id").defaultRandom().primaryKey();
const times = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...times(),
});
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...times(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...times(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...times(),
});
export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  theme: text("theme").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...times(),
});
export const media = pgTable("media_assets", {
  id: id(),
  r2ObjectKey: text("r2_object_key").notNull().unique(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  altText: text("alt_text").notNull(),
  ...times(),
});
export const products = pgTable(
  "products",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    primaryImageId: uuid("primary_image_id").references(() => media.id),
    additionalImageIds: jsonb("additional_image_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    ingredients: text("ingredients").notNull().default(""),
    allergens: text("allergens").notNull().default(""),
    availabilityStatus: text("availability_status").notNull(),
    isFeatured: boolean("is_featured").notNull().default(false),
    isCookieFlavor: boolean("is_cookie_flavor").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    ...times(),
  },
  (t) => [index("product_category_idx").on(t.categoryId)],
);
export const variants = pgTable("product_variants", {
  id: id(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  name: text("name").notNull(),
  unitCount: integer("unit_count").notNull(),
  priceCents: integer("price_cents").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
});
export const flights = pgTable("flight_configuration", {
  id: id(),
  productId: uuid("product_id")
    .notNull()
    .unique()
    .references(() => products.id),
  requiredFlavorCount: integer("required_flavor_count").notNull(),
  priceCents: integer("price_cents").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});
export const flightEligible = pgTable(
  "flight_eligible",
  {
    id: id(),
    flightId: uuid("flight_id")
      .notNull()
      .references(() => flights.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
  },
  (t) => [uniqueIndex("flight_flavor_unique").on(t.flightId, t.productId)],
);
export const settings = pgTable("business_settings", {
  id: integer("id").primaryKey(),
  value: jsonb("value").$type<Settings>().notNull(),
});
export const orders = pgTable(
  "orders",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    idempotencyKey: uuid("idempotency_key").notNull().unique(),
    requestHash: text("request_hash").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerType: text("customer_type").notNull(),
    preferredContactMethod: text("preferred_contact_method").notNull(),
    fulfillmentMethod: text("fulfillment_method").notNull(),
    deliveryAddress: text("delivery_address"),
    deliveryNotes: text("delivery_notes"),
    requestedDate: date("requested_date").notNull(),
    requestedTimeWindow: text("requested_time_window"),
    notes: text("notes"),
    subtotalCents: integer("subtotal_cents").notNull(),
    status: text("status").notNull().default("new"),
    notificationStatus: text("notification_status")
      .notNull()
      .default("pending"),
    notificationAttempt: integer("notification_attempt").notNull().default(0),
    notificationAttemptAt: timestamp("notification_attempt_at", {
      withTimezone: true,
    }),
    ...times(),
  },
  (t) => [index("order_created_idx").on(t.createdAt)],
);
export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    productId: uuid("product_id").references(() => products.id),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    variantNameSnapshot: text("variant_name_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    configurationSnapshot: jsonb("configuration_snapshot")
      .$type<{ flavors: string[] }>()
      .notNull(),
  },
  (t) => [index("item_order_idx").on(t.orderId)],
);
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
