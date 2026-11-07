import type { Catalog, OrderInput } from "../../shared/contracts";
export function priceOrder(input: OrderInput, data: Catalog) {
  if (
    !data.settings[
      input.fulfillmentMethod === "pickup" ? "pickupEnabled" : "deliveryEnabled"
    ]
  )
    throw new Error("This fulfillment method is currently unavailable.");
  return input.items.map((item) => {
    const p = data.products.find(
      (p) =>
        p.id === item.productId &&
        p.isActive &&
        p.availabilityStatus === "available",
    );
    if (!p)
      throw new Error(
        "An item is no longer available. Please review your order.",
      );
    const flight = data.flights.find((f) => f.productId === p.id && f.isActive);
    let price: number, label: string;
    let flavors: string[] = [];
    if (flight) {
      const ids = item.flavorIds ?? [];
      if (
        item.variantId ||
        new Set(ids).size !== flight.requiredFlavorCount ||
        ids.length !== flight.requiredFlavorCount
      )
        throw new Error(
          `Choose exactly ${flight.requiredFlavorCount} different flavors.`,
        );
      flavors = ids.map((id) => {
        const flavor = data.products.find(
          (p) =>
            p.id === id &&
            p.isCookieFlavor &&
            p.isActive &&
            p.availabilityStatus === "available",
        );
        if (!flavor || !flight.eligibleProductIds.includes(id))
          throw new Error("A flight flavor is unavailable.");
        return flavor.name;
      });
      price = flight.priceCents;
      label = "Cookie flight";
    } else {
      if (item.flavorIds?.length)
        throw new Error("Unexpected flavor selection.");
      const variant = p.variants.find(
        (v) => v.id === item.variantId && v.isAvailable,
      );
      if (!variant) throw new Error("Please select an available size.");
      price = variant.priceCents;
      label = variant.name;
    }
    return {
      productId: p.id,
      productNameSnapshot: p.name,
      variantNameSnapshot: label,
      quantity: item.quantity,
      unitPriceCents: price,
      lineTotalCents: price * item.quantity,
      configurationSnapshot: { flavors },
    };
  });
}
