import { describe, it, expect } from "vitest";
import {
  orderInput,
  type Catalog,
  type OrderInput,
  type Product,
} from "../shared/contracts";
import { priceOrder } from "../server/validation/pricing";
import { escapeHtml } from "../server/email/notification";
import { verifyImage } from "../server/storage/images";
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const product = (n: number): Product => ({
  id: uuid(n),
  name: `Cookie ${n}`,
  slug: `cookie-${n}`,
  categoryId: uuid(99),
  description: "",
  primaryImageId: null,
  additionalImageIds: [],
  ingredients: "",
  allergens: "",
  isActive: true,
  isFeatured: false,
  isCookieFlavor: true,
  availabilityStatus: "available",
  displayOrder: 0,
  variants: [
    {
      id: uuid(n + 100),
      name: "Dozen",
      priceCents: 3600,
      unitCount: 12,
      isAvailable: true,
      displayOrder: 0,
    },
  ],
});
const data: Catalog = {
  categories: [],
  products: [1, 2, 3, 4, 5].map(product),
  flights: [
    {
      id: uuid(200),
      productId: uuid(5),
      priceCents: 550,
      requiredFlavorCount: 4,
      isActive: true,
      eligibleProductIds: [1, 2, 3, 4].map(uuid),
    },
  ],
  settings: {
    displayName: "Bakery",
    contactEmail: "",
    contactPhone: "",
    pickupEnabled: true,
    deliveryEnabled: false,
    announcement: "",
    orderingInstructions: "",
    leadTimeGuidance: "",
  },
};
const input: OrderInput = {
  idempotencyKey: uuid(999),
  customerName: "A Customer",
  customerEmail: "customer@example.com",
  customerPhone: "5551234567",
  customerType: "new",
  preferredContactMethod: "email",
  fulfillmentMethod: "pickup",
  deliveryAddress: "",
  deliveryNotes: "",
  requestedDate: "2027-01-10",
  requestedTimeWindow: "",
  notes: "",
  acknowledgment: true,
  website: "",
  turnstileToken: "",
  items: [{ productId: uuid(1), variantId: uuid(101), quantity: 2 }],
};
describe("authoritative pricing", () => {
  it("uses variant cents and snapshots rather than customer prices", () => {
    const [line] = priceOrder(input, data);
    expect(line.lineTotalCents).toBe(7200);
    expect(line.variantNameSnapshot).toBe("Dozen");
    expect(line.productNameSnapshot).toBe("Cookie 1");
  });
  it.each(["sold_out", "coming_soon", "hidden"] as const)(
    "rejects %s products",
    (status) => {
      const copy = structuredClone(data);
      copy.products[0].availabilityStatus = status;
      expect(() => priceOrder(input, copy)).toThrow("no longer available");
    },
  );
  it("rejects unavailable variant and fulfillment", () => {
    const copy = structuredClone(data);
    copy.products[0].variants[0].isAvailable = false;
    expect(() => priceOrder(input, copy)).toThrow("available size");
    expect(() =>
      priceOrder({ ...input, fulfillmentMethod: "delivery" }, data),
    ).toThrow("fulfillment");
  });
  it("requires exactly four unique eligible available flavors", () => {
    const order = {
      ...input,
      items: [
        { productId: uuid(5), quantity: 3, flavorIds: [1, 2, 3, 4].map(uuid) },
      ],
    };
    expect(priceOrder(order, data)[0].lineTotalCents).toBe(1650);
    expect(
      priceOrder(order, data)[0].configurationSnapshot.flavors,
    ).toHaveLength(4);
    expect(() =>
      priceOrder(
        {
          ...order,
          items: [{ ...order.items[0], flavorIds: [1, 1, 2, 3].map(uuid) }],
        },
        data,
      ),
    ).toThrow("exactly");
    const copy = structuredClone(data);
    copy.products[0].availabilityStatus = "sold_out";
    expect(() => priceOrder(order, copy)).toThrow("flavor");
  });
});
describe("request validation", () => {
  it("accepts a complete request", () =>
    expect(orderInput.safeParse(input).success).toBe(true));
  it.each([
    { items: [] },
    { acknowledgment: false },
    { website: "spam" },
    { customerEmail: "invalid" },
    { fulfillmentMethod: "delivery", deliveryAddress: "" },
    { items: [{ productId: uuid(1), quantity: 101 }] },
  ])("rejects invalid input %j", (change) =>
    expect(orderInput.safeParse({ ...input, ...change }).success).toBe(false),
  );
});
describe("untrusted content", () => {
  it("escapes customer email content", () =>
    expect(escapeHtml("<img src=\"x\" onerror='bad'>&")).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;bad&#39;&gt;&amp;",
    ));
  it("rejects executable files even with image MIME", () =>
    expect(() =>
      verifyImage(
        new TextEncoder().encode('<svg onload="alert(1)"></svg>'),
        "image/png",
      ),
    ).toThrow());
  it("rejects oversized uploads", () =>
    expect(() =>
      verifyImage(new Uint8Array(5 * 1024 * 1024 + 1), "image/jpeg"),
    ).toThrow("5 MB"));
});
