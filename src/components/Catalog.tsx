import { useState } from "react";
import { Plus, Check, ArrowUpRight } from "lucide-react";
import type {
  Product,
  CartItem,
  Catalog,
  Flight,
} from "../../shared/contracts";
import { money } from "../../shared/contracts";
export function Photo({
  id,
  alt = "",
  className = "",
}: {
  id: string | null;
  alt?: string;
  className?: string;
}) {
  return id ? (
    <img
      className={`product-photo ${className}`}
      src={`/api/media/${id}`}
      alt={alt}
      loading="lazy"
      width="600"
      height="600"
    />
  ) : (
    <div className={`photo-placeholder ${className}`}>
      <span className="placeholder-rule" />
      <span>
        From our oven,
        <br />
        <i>with love.</i>
      </span>
      <small>PRODUCT PHOTOGRAPHY COMING SOON</small>
    </div>
  );
}
export function ProductCard({
  product: p,
  add,
}: {
  product: Product;
  add: (item: CartItem) => void;
}) {
  const [selected, setSelected] = useState("");
  const variant = p.variants.find((v) => v.id === selected) ?? p.variants[0];
  const available = p.availabilityStatus === "available" && !!variant;
  return (
    <article className="product-card">
      <div className="photo-wrap">
        <Photo id={p.primaryImageId} alt={p.imageAlt ?? p.name} />
        {!available && (
          <span className="badge">
            {p.availabilityStatus === "coming_soon"
              ? "Coming soon"
              : p.availabilityStatus === "sold_out"
                ? "Sold out"
                : "Unavailable"}
          </span>
        )}
      </div>
      <h3>{p.name}</h3>
      {p.description && <p>{p.description}</p>}
      {p.allergens && <small>Allergens: {p.allergens}</small>}
      {p.variants.length > 1 && (
        <label className="variant-label">
          Size
          <select
            value={variant?.id}
            onChange={(e) => setSelected(e.target.value)}
          >
            {p.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {money(v.priceCents)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="product-bottom">
        <span>
          {variant
            ? money(variant.priceCents)
            : "Something sweet is on its way"}
        </span>
        <button
          className="add-button"
          disabled={!available}
          aria-label={`Add ${p.name} to order`}
          onClick={() =>
            variant &&
            add({
              key: variant.id,
              productId: p.id,
              variantId: variant.id,
              quantity: 1,
              name: p.name,
              variantName: variant.name,
              unitPriceCents: variant.priceCents,
              imageId: p.primaryImageId,
            })
          }
        >
          <Plus size={16} /> Add to Order
        </button>
      </div>
    </article>
  );
}
export function FlightBuilder({
  flight,
  data,
  add,
}: {
  flight: Flight;
  data: Catalog;
  add: (item: CartItem) => void;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const product = data.products.find((p) => p.id === flight.productId);
  if (!product || product.availabilityStatus !== "available")
    return <p>Cookie flights are currently unavailable.</p>;
  const flavors = data.products.filter(
    (p) =>
      flight.eligibleProductIds.includes(p.id) &&
      p.isCookieFlavor &&
      p.availabilityStatus === "available",
  );
  const valid = ids.length === flight.requiredFlavorCount;
  return (
    <div className="flight-layout">
      <div>
        <span className="eyebrow">A LITTLE OF EVERYTHING</span>
        <h3 className="display">Pick {flight.requiredFlavorCount} Flavors</h3>
        <p>Your favorites, together in one sweet little flight.</p>
        <p className="flight-price">
          {money(flight.priceCents)} <small>per flight</small>
        </p>
        <a href="#order" className="text-link">
          Made to share. Or keep. <ArrowUpRight size={17} />
        </a>
      </div>
      <div>
        <div className="flavor-grid">
          {flavors.map((p) => (
            <button
              className={`flavor ${ids.includes(p.id) ? "selected" : ""}`}
              key={p.id}
              aria-pressed={ids.includes(p.id)}
              onClick={() =>
                setIds(
                  ids.includes(p.id)
                    ? ids.filter((id) => id !== p.id)
                    : ids.length < flight.requiredFlavorCount
                      ? [...ids, p.id]
                      : ids,
                )
              }
            >
              {p.primaryImageId && (
                <img
                  src={`/api/media/${p.primaryImageId}`}
                  alt=""
                  loading="lazy"
                />
              )}
              <span>{p.name.replace(" Cookie", "")}</span>
              <span className="selection-dot">
                {ids.includes(p.id) && <Check size={14} />}
              </span>
            </button>
          ))}
        </div>
        <div className="flight-controls">
          <p role="status">
            {ids.length} of {flight.requiredFlavorCount} flavors selected
            {!valid && (
              <small>
                Choose exactly {flight.requiredFlavorCount} different flavors.
              </small>
            )}
          </p>
          <label>
            Flights
            <input
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(100, Number(e.target.value))))
              }
            />
          </label>
          <button
            className="button"
            disabled={!valid}
            onClick={() => {
              add({
                key: flight.id + ids.slice().sort().join(""),
                productId: flight.productId,
                flavorIds: ids,
                quantity,
                name: product.name,
                variantName: "Cookie flight",
                flavorNames: ids.map(
                  (id) => flavors.find((f) => f.id === id)!.name,
                ),
                unitPriceCents: flight.priceCents,
                imageId: product.primaryImageId,
              });
              setIds([]);
            }}
          >
            Add flight <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
