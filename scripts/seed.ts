import "./env";
import { eq } from "drizzle-orm";
import { connect } from "../server/db/connect";
import * as s from "../server/db/schema";
const { db, pool } = connect(process.env.DATABASE_URL!);
const slug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
const breads: [string, number[], string?][] = [
  ["Sourdough Loaf", [1800]],
  ["Cheese & Herb Pull Apart", [2500]],
  ["Sticky Buns (2-Pack)", [1000]],
  ["Muffins", [350, 450]],
  ["Roasted Garlic & Herb Sourdough Loaf", [2000], "coming_soon"],
  ["Rosemary, Cranberry & Nut Sourdough Loaf", [2500], "coming_soon"],
  ["Cheddar & Jalapeño Sourdough Loaf", [2000]],
  ["Pumpkin Sticky Buns (2-Pack)", [1000], "coming_soon"],
];
const sweets: [string, number[], string?][] = [
  ["Chocolate Chip Cookie", [300, 1800, 3600]],
  ["Pumpkin Pecan Cookie", [375, 2250, 4500]],
  ["Pumpkin Cookie", [300, 1800, 3600]],
  ["Sugar Cookie", [250, 1500, 3000]],
  ["White Chocolate Macadamia Nut Cookie", [375, 2250, 4500]],
  ["Oatmeal Raisin Cookie", [], "coming_soon"],
  ["White Chocolate Peppermint Cookie", [], "coming_soon"],
  ["Brownies", [], "coming_soon"],
];
try {
  await db.transaction(async (tx) => {
    await tx
      .insert(s.settings)
      .values({
        id: 1,
        value: {
          displayName: "Sourdough Made Sweet Bakehouse",
          contactEmail: "",
          contactPhone: "",
          pickupEnabled: true,
          deliveryEnabled: true,
          orderingInstructions:
            "Orders are subject to availability and bakery confirmation.",
          leadTimeGuidance:
            "Please request your preferred date; we will confirm availability.",
          announcement: "",
        },
      })
      .onConflictDoNothing();
    for (const [index, name] of [
      "Breads",
      "Sweet Treats",
      "Cookie Flights",
    ].entries()) {
      await tx
        .insert(s.categories)
        .values({
          name,
          slug: slug(name),
          theme: ["cream", "chocolate", "gold"][index],
          displayOrder: index,
          description: [
            "From classic sourdough loaves to savory favorites, baked fresh and made to share.",
            "A little something sweet, made with care and meant to be enjoyed.",
            "A small taste of your favorites. Pick your flavors and make it your own.",
          ][index],
        })
        .onConflictDoNothing();
      const [cat] = await tx
        .select()
        .from(s.categories)
        .where(eq(s.categories.slug, slug(name)));
      const rows =
        index === 0
          ? breads
          : index === 1
            ? sweets
            : [["Cookie Flight", []] as [string, number[]]];
      for (const [position, [productName, prices, status]] of rows.entries()) {
        const [p] = await tx
          .insert(s.products)
          .values({
            categoryId: cat.id,
            name: productName,
            slug: slug(productName),
            availabilityStatus: status ?? "available",
            isCookieFlavor: productName.endsWith("Cookie"),
            displayOrder: position,
          })
          .onConflictDoNothing()
          .returning();
        if (!p) continue;
        for (const [i, price] of prices.entries())
          await tx.insert(s.variants).values({
            productId: p.id,
            name:
              productName === "Muffins"
                ? ["Mini", "Large"][i]
                : index === 1
                  ? ["Each", "6-Pack", "Dozen"][i]
                  : "Standard",
            priceCents: price,
            unitCount: index === 1 ? [1, 6, 12][i] : 1,
            displayOrder: i,
          });
        if (index === 2) {
          const [flight] = await tx
            .insert(s.flights)
            .values({
              productId: p.id,
              priceCents: 550,
              requiredFlavorCount: 4,
            })
            .returning();
          const cookies = await tx.select().from(s.products);
          await tx
            .insert(s.flightEligible)
            .values(
              cookies
                .filter(
                  (c) =>
                    sweets.some(([n]) => n === c.name) &&
                    c.name.endsWith("Cookie"),
                )
                .map((c) => ({ flightId: flight.id, productId: c.id })),
            );
        }
      }
    }
  });
  console.log("Initial catalog seeded without overwriting existing products.");
} finally {
  await pool.end();
}
