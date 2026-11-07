import { useEffect, useState } from "react";
import { ArrowRight, Menu, X, ShoppingBag, Heart, Wheat } from "lucide-react";
import { z } from "zod";
import {
  type Catalog,
  type CartItem,
  orderInput,
} from "../../shared/contracts";
import { api } from "../lib/api";
import { ProductCard, FlightBuilder, Photo } from "../components/Catalog";
import { Checkout } from "../components/Checkout";
const draftSchema = z
  .array(
    orderInput.shape.items.element.extend({
      key: z.string(),
      name: z.string(),
      variantName: z.string(),
      unitPriceCents: z.number().int().nonnegative(),
      imageId: z.string().nullable(),
      flavorNames: z.array(z.string()).optional(),
    }),
  )
  .max(50);
function initialCart(): CartItem[] {
  try {
    return draftSchema.parse(
      JSON.parse(localStorage.getItem("bakery-draft") ?? "[]"),
    );
  } catch {
    return [];
  }
}
export function Home() {
  const [data, setData] = useState<Catalog>();
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    api<Catalog>("/catalog")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("bakery-draft", JSON.stringify(cart));
    } catch {
      /* The current tab still retains the draft. */
    }
  }, [cart]);
  const add = (item: CartItem) => {
    setCart((current) => {
      const existing = current.find((c) => c.key === item.key);
      return existing
        ? current.map((c) =>
            c.key === item.key
              ? { ...c, quantity: Math.min(100, c.quantity + item.quantity) }
              : c,
          )
        : [...current, item];
    });
    setNotice(`${item.name} added to your order.`);
  };
  const hero = data?.products.find((p) => p.isFeatured && p.primaryImageId);
  const links = [
    ["Home", "home"],
    ["Breads", "breads"],
    ["Sweet Treats", "sweet-treats"],
    ["Cookie Flights", "cookie-flights"],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {data?.settings.announcement && (
        <div className="announcement">{data.settings.announcement}</div>
      )}
      <header className="header">
        <div className="nav container">
          <a
            href="#home"
            className="wordmark"
            aria-label="Sourdough Made Sweet Bakehouse home"
          >
            Sourdough <i>Made Sweet</i>
            <small>BAKEHOUSE</small>
          </a>
          <nav aria-label="Main navigation" className={menu ? "open" : ""}>
            {links.map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
            <a href="#order" onClick={() => setMenu(false)}>
              Order
            </a>
          </nav>
          <a className="button nav-cta" href="#order">
            Request an Order <ShoppingBag size={15} />
            {cart.length > 0 && (
              <span>{cart.reduce((n, i) => n + i.quantity, 0)}</span>
            )}
          </a>
          <button
            className="mobile-toggle icon-button"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">
        <section id="home" className="hero container">
          <div>
            <span className="eyebrow">HANDCRAFTED WITH LOVE</span>
            <h1>
              Sourdough Bread &amp; Sweets <i>Made Fresh</i>
            </h1>
            <p>
              Welcome to our cottage food bakery. Guaranteed Fresh Sourdough
              Breads &amp; Sweets made to Order
            </p>
            <div className="hero-actions">
              <a className="button" href="#breads">
                Explore Our Menu <ArrowRight size={18} />
              </a>
              <a className="button outline" href="#order">
                Request an Order
              </a>
            </div>
            <div className="hero-note">
              <span /> A little flour. A lot of heart.
            </div>
          </div>
          <div className="hero-art">
            <Photo
              id={hero?.primaryImageId ?? null}
              alt={hero?.imageAlt ?? hero?.name ?? ""}
            />
            <div className="seal">
              FRESHLY MADE<span>✧</span>MADE TO ORDER
            </div>
            <span className="art-caption">SLOWLY CRAFTED. SWEETLY SHARED.</span>
          </div>
        </section>
        <div className="intro-strip">
          <span>
            <Wheat size={20} /> Sourdough &amp; sweet things
          </span>
          <span>Made fresh, just for you</span>
          <span>
            <Heart size={18} /> A cottage food bakehouse
          </span>
        </div>
        {error ? (
          <section className="container section" role="alert">
            <h2>Our menu will be back soon.</h2>
            <p>We couldn't load the bakery menu. Please try again shortly.</p>
            <button className="button" onClick={() => location.reload()}>
              Try again
            </button>
          </section>
        ) : !data ? (
          <div className="container section" role="status">
            Warming up the menu…
          </div>
        ) : (
          <>
            {data.categories.map((category, index) => (
              <section
                key={category.id}
                id={category.slug}
                className={`section theme-${category.theme}`}
              >
                <div className="container">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">
                        {String(index + 1).padStart(2, "0")} / FROM THE
                        BAKEHOUSE
                      </span>
                      <h2>{category.name}</h2>
                    </div>
                    <p>{category.description}</p>
                  </div>
                  {data.flights
                    .filter((f) =>
                      data.products.some(
                        (p) =>
                          p.id === f.productId && p.categoryId === category.id,
                      ),
                    )
                    .map((f) => (
                      <FlightBuilder
                        key={f.id}
                        flight={f}
                        data={data}
                        add={add}
                      />
                    ))}
                  <div className="product-grid">
                    {data.products
                      .filter(
                        (p) =>
                          p.categoryId === category.id &&
                          !data.flights.some((f) => f.productId === p.id),
                      )
                      .map((p) => (
                        <ProductCard key={p.id} product={p} add={add} />
                      ))}
                  </div>
                </div>
              </section>
            ))}
            <section className="section container how">
              <span className="eyebrow">
                A SIMPLE WAY TO SOMETHING DELICIOUS
              </span>
              <h2>
                Freshly baked.
                <br />
                <i>Thoughtfully simple.</i>
              </h2>
              <div className="steps">
                {[
                  [
                    "01",
                    "Find your favorites",
                    "Browse our menu and build your own little box of happiness.",
                  ],
                  [
                    "02",
                    "Send a little request",
                    "Tell us what you would love and when you would like it.",
                  ],
                  [
                    "03",
                    "We’ll take it from here",
                    "We’ll contact you to confirm availability, fulfillment and payment arrangements.",
                  ],
                ].map(([n, title, text]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
              {data.settings.orderingInstructions && (
                <p>{data.settings.orderingInstructions}</p>
              )}
            </section>
            <Checkout cart={cart} setCart={setCart} settings={data.settings} />
          </>
        )}
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <a href="#home" className="wordmark">
              Sourdough <i>Made Sweet</i>
              <small>BAKEHOUSE</small>
            </a>
            <p>
              Made with love.
              <br />
              Baked fresh. Shared with joy.
            </p>
            <div>
              <a href="#breads">Our menu</a>
              <a href="#order">Request an order</a>
              {data?.settings.contactEmail && (
                <a href={`mailto:${data.settings.contactEmail}`}>
                  {data.settings.contactEmail}
                </a>
              )}
              {data?.settings.contactPhone && (
                <a href={`tel:${data.settings.contactPhone}`}>
                  {data.settings.contactPhone}
                </a>
              )}
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Sourdough Made Sweet Bakehouse
            </span>
            <span>A small bakery. A whole lot of love.</span>
          </div>
        </div>
      </footer>
      <div className="cart-notice" role="status">
        {notice && (
          <>
            <CheckMark />
            {notice}
            <a href="#order">View request →</a>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
function CheckMark() {
  return <Heart size={16} />;
}
