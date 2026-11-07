import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Trash2, ArrowRight } from "lucide-react";
import {
  orderInput,
  money,
  type OrderInput,
  type CartItem,
  type Settings,
} from "../../shared/contracts";
import { mutate } from "../lib/api";
import { Photo } from "./Catalog";
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}
export function Checkout({
  cart,
  setCart,
  settings,
}: {
  cart: CartItem[];
  setCart: (items: CartItem[]) => void;
  settings: Settings;
}) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.input<typeof orderInput>, unknown, OrderInput>({
    resolver: zodResolver(orderInput),
    defaultValues: {
      customerType: "new",
      preferredContactMethod: "either",
      fulfillmentMethod: settings.pickupEnabled ? "pickup" : "delivery",
      items: [],
      idempotencyKey: crypto.randomUUID(),
      website: "",
      turnstileToken: "",
      deliveryAddress: "",
      deliveryNotes: "",
      requestedTimeWindow: "",
      notes: "",
    },
  });
  useEffect(() => {
    setValue(
      "items",
      cart.map(({ productId, variantId, quantity, flavorIds }) => ({
        productId,
        variantId,
        quantity,
        flavorIds,
      })),
    );
  }, [cart, setValue]);
  useEffect(() => {
    setValue("turnstileToken", token);
  }, [token, setValue]);
  useEffect(() => {
    const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!key) return;
    let disposed = false;
    const render = () => {
      if (!disposed && widget.current && window.turnstile && !widgetId.current)
        widgetId.current = window.turnstile.render(widget.current, {
          sitekey: key,
          callback: (value: string) => setToken(value),
          "expired-callback": () => setToken(""),
        });
    };
    let script = document.querySelector<HTMLScriptElement>(
      "script[data-turnstile]",
    );
    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.dataset.turnstile = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    render();
    return () => {
      disposed = true;
      script?.removeEventListener("load", render);
      if (widgetId.current) {
        window.turnstile?.remove(widgetId.current);
        widgetId.current = undefined;
      }
    };
  }, []);
  const submit = handleSubmit(async (values) => {
    setError("");
    const payload = JSON.stringify({
      ...values,
      idempotencyKey: "",
      turnstileToken: "",
    });
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    try {
      const saved = await mutate<{ reference: string }>("/orders", {
        ...values,
        idempotencyKey: attempt.current.key,
      });
      setResult(saved.reference);
      setCart([]);
      reset();
      attempt.current = null;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
      setToken("");
    }
  });
  const field = (
    key:
      | "customerName"
      | "customerEmail"
      | "customerPhone"
      | "requestedDate"
      | "requestedTimeWindow"
      | "deliveryAddress"
      | "deliveryNotes",
    label: string,
    type = "text",
    required = false,
  ) => (
    <label>
      {label}
      {required ? " *" : ""}
      <input
        {...register(key)}
        type={type}
        aria-invalid={!!errors[key]}
        autoComplete={
          key === "customerName"
            ? "name"
            : key === "customerEmail"
              ? "email"
              : key === "customerPhone"
                ? "tel"
                : undefined
        }
      />
      {errors[key] && <span className="error">{errors[key]?.message}</span>}
    </label>
  );
  return (
    <section id="order" className="section container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FRESH FROM OUR KITCHEN TO YOURS</span>
          <h2>
            Let's Bake
            <br />
            <i>Something Special</i>
          </h2>
        </div>
        <p>
          Have your favorites made fresh for you. Submit your order request, and
          we'll be in touch to confirm the details and availability.
        </p>
      </div>
      {result && (
        <div className="success" role="status">
          <h3>Thank you. Your request is saved.</h3>
          <p>
            Reference: <strong>{result}</strong>. Your order is pending bakery
            confirmation. We will contact you to finalize availability and
            fulfillment details.
          </p>
        </div>
      )}
      <form onSubmit={submit} className="checkout" noValidate>
        <div>
          <p className="notice">
            Submitting this form does not confirm your order. We will contact
            you to finalize availability and fulfillment details.
          </p>
          <fieldset>
            <legend>
              <span>01</span> A little about you
            </legend>
            <div className="form-grid">
              {field("customerName", "Full Name", "text", true)}
              {field("customerEmail", "Email Address", "email", true)}
              {field("customerPhone", "Phone Number", "tel", true)}
              <label>
                Customer Type
                <select {...register("customerType")}>
                  <option value="new">New Customer</option>
                  <option value="returning">Returning Customer</option>
                </select>
              </label>
              <label>
                Preferred Contact Method
                <select {...register("preferredContactMethod")}>
                  <option value="either">Either</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>
              <span>02</span> The finishing details
            </legend>
            <div className="radios">
              {settings.pickupEnabled && (
                <label>
                  <input
                    type="radio"
                    value="pickup"
                    {...register("fulfillmentMethod")}
                  />{" "}
                  Pickup
                </label>
              )}
              {settings.deliveryEnabled && (
                <label>
                  <input
                    type="radio"
                    value="delivery"
                    {...register("fulfillmentMethod")}
                  />{" "}
                  Delivery
                </label>
              )}
            </div>
            <p className="muted">
              {settings.leadTimeGuidance} Requested dates and times are
              preferences, not guaranteed availability.
            </p>
            <div className="form-grid">
              {field("requestedDate", "Requested Date", "date", true)}
              {field("requestedTimeWindow", "Preferred Time Window")}
              {watch("fulfillmentMethod") === "delivery" && (
                <>
                  {field("deliveryAddress", "Delivery Address", "text", true)}
                  {field("deliveryNotes", "Delivery Notes")}
                </>
              )}
            </div>
            {watch("fulfillmentMethod") === "delivery" && (
              <p className="muted">
                Additional delivery fees, if applicable, will be confirmed.
              </p>
            )}
            <label>
              Special Instructions
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Anything you'd like us to know?"
              />
            </label>
          </fieldset>
          <div className="honeypot" aria-hidden="true">
            <label>
              Website
              <input
                {...register("website")}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          <label className="checkbox">
            <input type="checkbox" {...register("acknowledgment")} /> I
            understand this is an order request, subject to bakery confirmation.
          </label>
          {errors.acknowledgment && (
            <p className="error">
              Please acknowledge that your order needs confirmation.
            </p>
          )}
          <div ref={widget} />
          {errors.items && (
            <p className="error">Add at least one product to your request.</p>
          )}
          {Object.entries(errors)
            .filter(
              ([key]) =>
                ![
                  "acknowledgment",
                  "items",
                  "customerName",
                  "customerEmail",
                  "customerPhone",
                  "requestedDate",
                  "requestedTimeWindow",
                  "deliveryAddress",
                  "deliveryNotes",
                ].includes(key),
            )
            .map(([key, value]) => (
              <p className="error" key={key}>
                {value.message}
              </p>
            ))}
          {error && (
            <p role="alert" className="error">
              {error} Your details have been kept.
            </p>
          )}
          <button
            type="submit"
            className="button submit"
            disabled={isSubmitting || !cart.length}
          >
            {isSubmitting ? "Saving your request…" : "Submit Order Request"}
            <ArrowRight size={18} />
          </button>
          <small className="muted">No payment is collected here.</small>
        </div>
        <aside className="order-summary">
          <span className="eyebrow">SOMETHING GOOD IS IN THE MAKING</span>
          <h3>Your order request</h3>
          {!cart.length && (
            <p>
              Your favorites belong here.
              <br />
              <a href="#breads">Explore the menu →</a>
            </p>
          )}
          {cart.map((item, index) => (
            <div className="summary-item" key={item.key}>
              <Photo id={item.imageId} alt={item.name} />
              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.variantName} · {money(item.unitPriceCents)}
                </small>
                {item.flavorNames && (
                  <small>{item.flavorNames.join(", ")}</small>
                )}
                <div className="quantity-row">
                  <label>
                    Qty
                    <input
                      aria-label={`Quantity for ${item.name}`}
                      type="number"
                      min="1"
                      max="100"
                      value={item.quantity}
                      onChange={(e) =>
                        setCart(
                          cart.map((c, i) =>
                            i === index
                              ? {
                                  ...c,
                                  quantity: Math.max(
                                    1,
                                    Math.min(100, Number(e.target.value)),
                                  ),
                                }
                              : c,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setCart(cart.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={17} />
                  </button>
                  <span>{money(item.quantity * item.unitPriceCents)}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="subtotal">
            <span>Estimated Subtotal</span>
            <strong>
              {money(
                cart.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0),
              )}
            </strong>
          </div>
          <small>
            Final pricing may change for delivery fees or special requests.
            We'll confirm everything with you.
          </small>
        </aside>
      </form>
    </section>
  );
}
