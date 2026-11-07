import type { DB } from "./connect";
import * as s from "./schema";
import type { Catalog } from "../../shared/contracts";
export async function catalog(db: DB, admin = false): Promise<Catalog> {
  // Queries also run inside order transactions, which share one pg connection.
  const cats = await db.select().from(s.categories);
  const prods = await db.select().from(s.products);
  const vars = await db.select().from(s.variants);
  const configs = await db.select().from(s.flights);
  const eligible = await db.select().from(s.flightEligible);
  const config = await db.select().from(s.settings);
  const images = await db.select().from(s.media);
  if (!config[0]) throw new Error("Catalog has not been seeded");
  const categories = cats
    .filter((c) => admin || c.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  return {
    categories,
    products: prods
      .filter(
        (p) =>
          admin ||
          (p.isActive &&
            p.availabilityStatus !== "hidden" &&
            categories.some((c) => c.id === p.categoryId)),
      )
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((p) => ({
        ...p,
        imageAlt: images.find((i) => i.id === p.primaryImageId)?.altText,
        variants: vars
          .filter((v) => v.productId === p.id && (admin || v.isAvailable))
          .sort((a, b) => a.displayOrder - b.displayOrder),
      })),
    flights: configs
      .filter((f) => admin || f.isActive)
      .map((f) => ({
        ...f,
        eligibleProductIds: eligible
          .filter((e) => e.flightId === f.id)
          .map((e) => e.productId),
      })),
    settings: config[0].value,
  } as Catalog;
}
