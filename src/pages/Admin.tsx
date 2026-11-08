import { NavigationEditor } from "../components/NavigationEditor";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  AppearanceEditor,
  BackgroundEditor,
} from "../components/AppearanceEditor";
import { appearanceSchema } from "../../shared/appearance";
import { useBrand } from "../hooks/useBrand";
import { Plus, LogOut, ArrowLeft } from "lucide-react";
import { api, mutate } from "../lib/api";
import {
  money,
  statuses,
  type Catalog,
  type Category,
  type Product,
  type Settings,
  type Flight,
} from "../../shared/contracts";
import { Photo } from "../components/Catalog";
type Media = { id: string; filename: string; altText: string };
type Order = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerType: string;
  preferredContactMethod: string;
  fulfillmentMethod: string;
  deliveryAddress: string;
  deliveryNotes: string;
  requestedDate: string;
  requestedTimeWindow: string;
  notes: string;
  subtotalCents: number;
  status: (typeof statuses)[number];
  notificationStatus: string;
  createdAt: string;
  items?: {
    id: string;
    productNameSnapshot: string;
    variantNameSnapshot: string;
    quantity: number;
    lineTotalCents: number;
    configurationSnapshot: { flavors: string[] };
  }[];
};
const blankCategory = {
  name: "",
  slug: "",
  description: "",
  theme: "cream",
  displayOrder: 0,
  isActive: true,
} as Category;
const blankProduct = {
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  primaryImageId: null,
  additionalImageIds: [],
  ingredients: "",
  allergens: "",
  availabilityStatus: "available",
  isActive: true,
  isFeatured: false,
  isCookieFlavor: false,
  displayOrder: 0,
  variants: [],
} as unknown as Product;
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
export function Login() {
  const [siteSettings, setSiteSettings] = useState<Settings>();
  useBrand(siteSettings?.appearance);
  useEffect(() => {
    api<Catalog>("/catalog")
      .then((c) => setSiteSettings(c.settings))
      .catch(() => {
        /* Sign-in remains available if the catalog is offline. */
      });
  }, []);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await mutate("/auth/sign-in/email", {
        email: form.get("email"),
        password: form.get("password"),
      });
      navigate("/admin");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login container">
      <a href="/">← Back to the bakehouse</a>
      <span className="eyebrow">SOURDOUGH MADE SWEET</span>
      <h1>Welcome back.</h1>
      <p>Your bakehouse, at your fingertips.</p>
      <form onSubmit={submit}>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <small>Owner access only. There is no public registration.</small>
    </main>
  );
}
export function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState<Catalog>();
  useBrand(data?.settings.appearance);
  const [orders, setOrders] = useState<Order[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const [catalog, requests, images] = await Promise.all([
        api<Catalog>("/admin/catalog"),
        api<Order[]>("/admin/orders"),
        api<Media[]>("/admin/media"),
      ]);
      setData(catalog);
      setOrders(requests);
      setMedia(images);
    } catch (e) {
      if (
        (e as Error).message === "Please sign in." ||
        (e as Error).message === "Owner access required."
      )
        navigate("/admin/login");
      else setMessage((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage("Saved successfully.");
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function archive(kind: string, id: string) {
    if (
      confirm(
        `Archive this ${kind.slice(0, -1)}? Existing orders will be preserved.`,
      )
    )
      void run(() => api(`/admin/${kind}/${id}`, { method: "DELETE" }));
  }
  const openOrder = async (id: string) => {
    try {
      setOrder(await api<Order>(`/admin/orders/${id}`));
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const orderTable = (rows: Order[]) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {[
              "Reference",
              "Customer",
              "Submitted",
              "Requested",
              "Estimated total",
              "Fulfillment",
              "Status",
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td>
                <button
                  className="text-button"
                  onClick={() => void openOrder(o.id)}
                >
                  {o.reference}
                </button>
              </td>
              <td>{o.customerName}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              <td>{o.requestedDate}</td>
              <td>{money(o.subtotalCents)}</td>
              <td>{o.fulfillmentMethod}</td>
              <td>{o.status.replaceAll("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>No order requests yet.</p>}
    </div>
  );
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <a href="/" className="wordmark">
          Sourdough <i>Made Sweet</i>
          <small>OWNER'S KITCHEN</small>
        </a>
        <nav aria-label="Owner dashboard">
          {[
            "Overview",
            "Categories",
            "Products",
            "Orders",
            "Media",
            "Settings",
          ].map((t) => (
            <button
              className={t === tab ? "active" : ""}
              key={t}
              onClick={() => {
                setTab(t);
                setCategory(null);
                setProduct(null);
                setOrder(null);
                setMessage("");
              }}
            >
              {t}
            </button>
          ))}
        </nav>
        <button
          onClick={() =>
            void run(async () => {
              await mutate("/auth/sign-out", {});
              navigate("/admin/login");
            })
          }
        >
          <LogOut size={16} /> Log Out
        </button>
      </aside>
      <main className="admin-main">
        <span className="eyebrow">THE BAKEHOUSE / OWNER DASHBOARD</span>
        <h1>{tab}</h1>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {!data ? (
          <p>Loading your bakehouse…</p>
        ) : (
          <>
            {tab === "Overview" && (
              <>
                <div className="stats">
                  {[
                    [
                      "Active products",
                      data.products.filter((p) => p.isActive).length,
                    ],
                    ["Categories", data.categories.length],
                    [
                      "New requests",
                      orders.filter((o) => o.status === "new").length,
                    ],
                    [
                      "Awaiting confirmation",
                      orders.filter((o) =>
                        ["new", "contacted"].includes(o.status),
                      ).length,
                    ],
                  ].map(([label, count]) => (
                    <div key={label}>
                      <strong>{count}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <h2>Recent requests</h2>
                {orderTable(orders.slice(0, 8))}
              </>
            )}
            {tab === "Categories" &&
              (category ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await mutate(
                        `/admin/categories${category.id ? "/" + category.id : ""}`,
                        category,
                        category.id ? "PATCH" : "POST",
                      );
                      setCategory(null);
                    });
                  }}
                  className="admin-form"
                >
                  <h2>{category.id ? "Edit" : "Add"} category</h2>
                  <label>
                    Name
                    <input
                      required
                      value={category.name}
                      onChange={(e) =>
                        setCategory({
                          ...category,
                          name: e.target.value,
                          slug: category.id
                            ? category.slug
                            : slug(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Slug
                    <input
                      required
                      value={category.slug}
                      onChange={(e) =>
                        setCategory({ ...category, slug: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={category.description}
                      onChange={(e) =>
                        setCategory({
                          ...category,
                          description: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Inherit brand color
                    <select
                      value={category.theme}
                      onChange={(e) =>
                        setCategory({
                          ...category,
                          theme: e.target.value as Category["theme"],
                        })
                      }
                    >
                      {["cream", "chocolate", "gold"].map((v) => (
                        <option key={v} value={v}>
                          {
                            (
                              {
                                cream: "Page background",
                                chocolate: "Primary brand color",
                                gold: "Accent brand color",
                              } as Record<string, string>
                            )[v]
                          }
                        </option>
                      ))}
                    </select>
                  </label>
                  <BackgroundEditor
                    value={category.style}
                    media={media}
                    fallback={
                      appearanceSchema.parse(data.settings.appearance ?? {})[
                        (
                          {
                            cream: "background",
                            chocolate: "primary",
                            gold: "accent",
                          } as const
                        )[category.theme]
                      ]
                    }
                    onChange={(style) => setCategory({ ...category, style })}
                  />
                  <label>
                    Display order
                    <input
                      type="number"
                      min="0"
                      value={category.displayOrder}
                      onChange={(e) =>
                        setCategory({
                          ...category,
                          displayOrder: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={category.isActive}
                      onChange={(e) =>
                        setCategory({ ...category, isActive: e.target.checked })
                      }
                    />{" "}
                    Active
                  </label>
                  <Actions busy={busy} cancel={() => setCategory(null)} />
                </form>
              ) : (
                <>
                  <button
                    className="button"
                    onClick={() => setCategory({ ...blankCategory })}
                  >
                    <Plus size={16} /> Add category
                  </button>
                  <div className="admin-list">
                    {data.categories.map((c) => (
                      <article key={c.id}>
                        <div>
                          <h3>{c.name}</h3>
                          <small>
                            {c.slug} · {c.theme} ·{" "}
                            {c.isActive ? "Active" : "Archived"} · Order{" "}
                            {c.displayOrder}
                          </small>
                        </div>
                        <button onClick={() => setCategory(c)}>Edit</button>
                        <button onClick={() => archive("categories", c.id)}>
                          Archive
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              ))}
            {tab === "Products" &&
              (product ? (
                <form
                  className="admin-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await mutate(
                        `/admin/products${product.id ? "/" + product.id : ""}`,
                        product,
                        product.id ? "PATCH" : "POST",
                      );
                      setProduct(null);
                    });
                  }}
                >
                  <h2>{product.id ? "Edit" : "Add"} product</h2>
                  <div className="form-grid">
                    <label>
                      Name
                      <input
                        required
                        value={product.name}
                        onChange={(e) =>
                          setProduct({
                            ...product,
                            name: e.target.value,
                            slug: product.id
                              ? product.slug
                              : slug(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Slug
                      <input
                        required
                        value={product.slug}
                        onChange={(e) =>
                          setProduct({ ...product, slug: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Category
                      <select
                        required
                        value={product.categoryId}
                        onChange={(e) =>
                          setProduct({ ...product, categoryId: e.target.value })
                        }
                      >
                        <option value="">Select category</option>
                        {data.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Availability
                      <select
                        value={product.availabilityStatus}
                        onChange={(e) =>
                          setProduct({
                            ...product,
                            availabilityStatus: e.target
                              .value as Product["availabilityStatus"],
                          })
                        }
                      >
                        {["available", "sold_out", "coming_soon", "hidden"].map(
                          (v) => (
                            <option key={v} value={v}>
                              {v.replaceAll("_", " ")}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <label>
                    Description
                    <textarea
                      value={product.description}
                      onChange={(e) =>
                        setProduct({ ...product, description: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Ingredients
                    <textarea
                      value={product.ingredients}
                      onChange={(e) =>
                        setProduct({ ...product, ingredients: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Allergens
                    <input
                      value={product.allergens}
                      onChange={(e) =>
                        setProduct({ ...product, allergens: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Primary image
                    <select
                      value={product.primaryImageId ?? ""}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          primaryImageId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">No photograph yet</option>
                      {media.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.filename} — {m.altText}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Photo
                    id={product.primaryImageId}
                    alt={
                      media.find((m) => m.id === product.primaryImageId)
                        ?.altText
                    }
                  />
                  <Upload
                    busy={busy}
                    save={(form) =>
                      run(async () => {
                        const uploaded = await api<Media>("/admin/media", {
                          method: "POST",
                          body: form,
                        });
                        setProduct({ ...product, primaryImageId: uploaded.id });
                      })
                    }
                  />
                  <fieldset>
                    <legend>Additional photographs</legend>
                    {media
                      .filter((m) => m.id !== product.primaryImageId)
                      .map((m) => (
                        <label className="checkbox" key={m.id}>
                          <input
                            type="checkbox"
                            checked={product.additionalImageIds.includes(m.id)}
                            onChange={(e) =>
                              setProduct({
                                ...product,
                                additionalImageIds: e.target.checked
                                  ? [...product.additionalImageIds, m.id]
                                  : product.additionalImageIds.filter(
                                      (id) => id !== m.id,
                                    ),
                              })
                            }
                          />
                          {m.filename}
                        </label>
                      ))}
                  </fieldset>
                  <fieldset>
                    <legend>Pricing variants · prices in cents</legend>
                    {product.variants.map((v, i) => (
                      <div className="variant-editor" key={i}>
                        <label>
                          Name
                          <input
                            required
                            value={v.name}
                            onChange={(e) =>
                              setProduct({
                                ...product,
                                variants: product.variants.map((v, n) =>
                                  n === i ? { ...v, name: e.target.value } : v,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Unit count
                          <input
                            type="number"
                            min="1"
                            value={v.unitCount}
                            onChange={(e) =>
                              setProduct({
                                ...product,
                                variants: product.variants.map((v, n) =>
                                  n === i
                                    ? {
                                        ...v,
                                        unitCount: Number(e.target.value),
                                      }
                                    : v,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Price (cents)
                          <input
                            type="number"
                            min="0"
                            value={v.priceCents}
                            onChange={(e) =>
                              setProduct({
                                ...product,
                                variants: product.variants.map((v, n) =>
                                  n === i
                                    ? {
                                        ...v,
                                        priceCents: Number(e.target.value),
                                      }
                                    : v,
                                ),
                              })
                            }
                          />
                        </label>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={v.isAvailable}
                            onChange={(e) =>
                              setProduct({
                                ...product,
                                variants: product.variants.map((v, n) =>
                                  n === i
                                    ? { ...v, isAvailable: e.target.checked }
                                    : v,
                                ),
                              })
                            }
                          />{" "}
                          Available
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setProduct({
                              ...product,
                              variants: product.variants.filter(
                                (_, n) => n !== i,
                              ),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setProduct({
                          ...product,
                          variants: [
                            ...product.variants,
                            {
                              name: "",
                              priceCents: 0,
                              unitCount: 1,
                              isAvailable: true,
                              displayOrder: product.variants.length,
                            } as Product["variants"][number],
                          ],
                        })
                      }
                    >
                      + Add variant
                    </button>
                  </fieldset>
                  <label>
                    Display order
                    <input
                      type="number"
                      min="0"
                      value={product.displayOrder}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          displayOrder: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={product.isFeatured}
                      onChange={(e) =>
                        setProduct({ ...product, isFeatured: e.target.checked })
                      }
                    />{" "}
                    Featured (first featured photograph is used in the hero)
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={product.isCookieFlavor}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          isCookieFlavor: e.target.checked,
                        })
                      }
                    />{" "}
                    Cookie product (may be included in flights)
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={product.isActive}
                      onChange={(e) =>
                        setProduct({ ...product, isActive: e.target.checked })
                      }
                    />{" "}
                    Active
                  </label>
                  <Actions busy={busy} cancel={() => setProduct(null)} />
                </form>
              ) : (
                <>
                  <button
                    className="button"
                    onClick={() => setProduct({ ...blankProduct })}
                  >
                    <Plus size={16} /> Add product
                  </button>
                  <div className="admin-list">
                    {data.products.map((p) => (
                      <article key={p.id}>
                        <div>
                          <h3>{p.name}</h3>
                          <small>
                            {p.availabilityStatus.replaceAll("_", " ")} ·{" "}
                            {p.isActive ? "Active" : "Archived"} ·{" "}
                            {p.variants
                              .map((v) => `${v.name}: ${money(v.priceCents)}`)
                              .join(" / ")}
                          </small>
                        </div>
                        <button onClick={() => setProduct(structuredClone(p))}>
                          Edit
                        </button>
                        <button onClick={() => archive("products", p.id)}>
                          Archive
                        </button>
                      </article>
                    ))}
                  </div>
                  <h2>Cookie flight configuration</h2>
                  {data.flights.map((f) => (
                    <FlightEditor
                      key={f.id}
                      flight={f}
                      products={data.products}
                      busy={busy}
                      save={(value) =>
                        run(() =>
                          mutate(`/admin/flights/${f.id}`, value, "PATCH"),
                        )
                      }
                    />
                  ))}
                </>
              ))}
            {tab === "Orders" && (
              <>
                {order ? (
                  <>
                    <button onClick={() => setOrder(null)}>
                      <ArrowLeft size={16} /> All requests
                    </button>
                    <h2>{order.reference}</h2>
                    <div className="order-detail">
                      <h3>{order.customerName}</h3>
                      <p>
                        {order.customerEmail} · {order.customerPhone}
                      </p>
                      <p>
                        {order.customerType} customer · Contact by{" "}
                        {order.preferredContactMethod}
                      </p>
                      <p>
                        {order.fulfillmentMethod} · {order.requestedDate} ·{" "}
                        {order.requestedTimeWindow}
                      </p>
                      <p>
                        {order.deliveryAddress}
                        <br />
                        {order.deliveryNotes}
                      </p>
                      <p>{order.notes}</p>
                      {order.items?.map((i) => (
                        <p key={i.id}>
                          {i.quantity} × {i.productNameSnapshot} (
                          {i.variantNameSnapshot}) — {money(i.lineTotalCents)}
                          <br />
                          {i.configurationSnapshot.flavors.join(", ")}
                        </p>
                      ))}
                      <strong>
                        Estimated subtotal: {money(order.subtotalCents)}
                      </strong>
                      <label>
                        Status
                        <select
                          value={order.status}
                          onChange={(e) => {
                            const status = e.target.value as Order["status"];
                            void run(async () => {
                              await mutate(
                                `/admin/orders/${order.id}`,
                                { status },
                                "PATCH",
                              );
                              setOrder({ ...order, status });
                            });
                          }}
                        >
                          {statuses.map((v) => (
                            <option key={v} value={v}>
                              {v.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p>
                        Bakery notification:{" "}
                        {order.notificationStatus === "sent"
                          ? "Accepted by email provider"
                          : order.notificationStatus}
                      </p>
                      <button
                        disabled={busy || order.notificationStatus === "sent"}
                        onClick={() =>
                          void run(async () => {
                            await mutate(
                              `/admin/orders/${order.id}/retry-notification`,
                              {},
                            );
                            await openOrder(order.id);
                          })
                        }
                      >
                        Retry notification
                      </button>
                      <p className="muted">
                        Status changes do not automatically email the customer.
                      </p>
                    </div>
                  </>
                ) : (
                  orderTable(orders)
                )}
              </>
            )}
            {tab === "Media" && (
              <>
                <Upload
                  busy={busy}
                  save={(form) =>
                    run(() =>
                      api("/admin/media", { method: "POST", body: form }),
                    )
                  }
                />
                <div className="product-grid admin-media">
                  {media.map((m) => (
                    <article key={m.id}>
                      <Photo id={m.id} alt={m.altText} />
                      <p>{m.filename}</p>
                      <small>{m.altText}</small>
                      <button
                        onClick={() => {
                          const altText = prompt(
                            "Describe this photograph for customers using screen readers.",
                            m.altText,
                          );
                          if (altText?.trim())
                            void run(() =>
                              mutate(
                                `/admin/media/${m.id}`,
                                { altText },
                                "PATCH",
                              ),
                            );
                        }}
                      >
                        Edit alternative text
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Delete this image? Referenced images cannot be deleted.",
                            )
                          )
                            void run(() =>
                              api(`/admin/media/${m.id}`, { method: "DELETE" }),
                            );
                        }}
                      >
                        Delete
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
            {tab === "Settings" && (
              <SettingsEditor
                settings={data.settings}
                categories={data.categories}
                media={media}
                busy={busy}
                save={(value) =>
                  run(() => mutate("/admin/settings", value, "PATCH"))
                }
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
function Actions({ busy, cancel }: { busy: boolean; cancel: () => void }) {
  return (
    <div className="actions">
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </button>
      <button type="button" onClick={cancel}>
        Cancel
      </button>
    </div>
  );
}
function Upload({
  busy,
  save,
}: {
  busy: boolean;
  save: (form: FormData) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [alt, setAlt] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <fieldset className="upload">
      <legend>Upload a product photograph</legend>
      <label>
        JPG, PNG or WebP · maximum 5 MB
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0])}
        />
      </label>
      <label>
        Descriptive alternative text
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          maxLength={300}
        />
      </label>
      {preview && <img className="upload-preview" src={preview} alt={alt} />}
      <button
        type="button"
        disabled={busy || !file || !alt.trim()}
        onClick={() => {
          if (!file) return;
          const form = new FormData();
          form.set("file", file);
          form.set("altText", alt);
          void save(form);
        }}
      >
        Upload photograph
      </button>
    </fieldset>
  );
}
function SettingsEditor({
  categories,
  media,
  settings,
  busy,
  save,
}: {
  settings: Settings;
  categories: Category[];
  media: Media[];
  busy: boolean;
  save: (value: Settings) => Promise<void>;
}) {
  const [value, setValue] = useState(settings);
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save(value);
      }}
    >
      <NavigationEditor
        value={value.navigation}
        categories={categories}
        onChange={(navigation) => setValue({ ...value, navigation })}
      />
      <AppearanceEditor
        value={value.appearance}
        media={media}
        onChange={(appearance) => setValue({ ...value, appearance })}
      />
      {(
        [
          "displayName",
          "contactEmail",
          "contactPhone",
          "orderingInstructions",
          "leadTimeGuidance",
          "announcement",
        ] as const
      ).map((key) => (
        <label key={key}>
          {key.replace(/([A-Z])/g, " $1")}
          <textarea
            value={value[key]}
            onChange={(e) => setValue({ ...value, [key]: e.target.value })}
          />
        </label>
      ))}
      {(["pickupEnabled", "deliveryEnabled"] as const).map((key) => (
        <label className="checkbox" key={key}>
          <input
            type="checkbox"
            checked={value[key]}
            onChange={(e) => setValue({ ...value, [key]: e.target.checked })}
          />
          {key === "pickupEnabled" ? "Offer pickup" : "Offer delivery"}
        </label>
      ))}
      <button className="button" disabled={busy}>
        Save settings
      </button>
    </form>
  );
}
function FlightEditor({
  flight,
  products,
  busy,
  save,
}: {
  flight: Flight;
  products: Product[];
  busy: boolean;
  save: (value: Flight) => Promise<void>;
}) {
  const [value, setValue] = useState(flight);
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save(value);
      }}
    >
      <label>
        Price in cents
        <input
          type="number"
          min="0"
          value={value.priceCents}
          onChange={(e) =>
            setValue({ ...value, priceCents: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Required flavors
        <input
          type="number"
          min="1"
          max="12"
          value={value.requiredFlavorCount}
          onChange={(e) =>
            setValue({ ...value, requiredFlavorCount: Number(e.target.value) })
          }
        />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={value.isActive}
          onChange={(e) => setValue({ ...value, isActive: e.target.checked })}
        />{" "}
        Available
      </label>
      <fieldset>
        <legend>Eligible cookie products</legend>
        {products
          .filter((p) => p.isCookieFlavor && p.id !== flight.productId)
          .map((p) => (
            <label className="checkbox" key={p.id}>
              <input
                type="checkbox"
                checked={value.eligibleProductIds.includes(p.id)}
                onChange={(e) =>
                  setValue({
                    ...value,
                    eligibleProductIds: e.target.checked
                      ? [...value.eligibleProductIds, p.id]
                      : value.eligibleProductIds.filter((id) => id !== p.id),
                  })
                }
              />
              {p.name}
            </label>
          ))}
      </fieldset>
      <button className="button" disabled={busy}>
        Save flight
      </button>
    </form>
  );
}
