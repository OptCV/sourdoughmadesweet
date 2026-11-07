import { and, eq, ne, or, lt, isNull, sql } from "drizzle-orm";
import type { DB } from "../db/connect";
import type { Env } from "../env";
import { orders, orderItems } from "../db/schema";
import { money } from "../../shared/contracts";
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function notificationText(
  order: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
) {
  return [
    `New Order Request — Sourdough Made Sweet — ${order.reference}`,
    `Submitted: ${order.createdAt.toISOString()}`,
    `Status: ${order.status}`,
    `Customer: ${order.customerName} (${order.customerType})`,
    `Email: ${order.customerEmail}`,
    `Phone: ${order.customerPhone}`,
    `Contact preference: ${order.preferredContactMethod}`,
    `Fulfillment: ${order.fulfillmentMethod}`,
    `Requested: ${order.requestedDate} ${order.requestedTimeWindow ?? ""}`,
    `Address: ${order.deliveryAddress ?? ""}`,
    `Delivery notes: ${order.deliveryNotes ?? ""}`,
    ...items.map(
      (i) =>
        `${i.quantity} × ${i.productNameSnapshot} / ${i.variantNameSnapshot} @ ${money(i.unitPriceCents)} = ${money(i.lineTotalCents)}${i.configurationSnapshot.flavors.length ? " — " + i.configurationSnapshot.flavors.join(", ") : ""}`,
    ),
    `Estimated subtotal: ${money(order.subtotalCents)}`,
    `Special instructions: ${order.notes ?? ""}`,
    "Pending bakery confirmation. Delivery fees and special requests may change the final price.",
  ].join("\n");
}
export async function notifyOrder(db: DB, env: Env, id: string) {
  const [order] = await db
    .update(orders)
    .set({ notificationStatus: "sending", notificationAttemptAt: new Date() })
    .where(
      and(
        eq(orders.id, id),
        ne(orders.notificationStatus, "sent"),
        or(
          ne(orders.notificationStatus, "sending"),
          isNull(orders.notificationAttemptAt),
          lt(orders.notificationAttemptAt, new Date(Date.now() - 120000)),
        ),
      ),
    )
    .returning();
  if (!order) return;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));
  try {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
      throw new Error("Email is not configured");
    const text = notificationText(order, items);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${order.id}-${order.notificationAttempt}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: ["orders@sourdoughmadesweet.com"],
        reply_to: order.customerEmail,
        subject: `New Order Request — Sourdough Made Sweet — ${order.reference}`,
        text,
        html: `<div style="background:#FFFCED;color:#452920;padding:32px;font-family:Arial"><h1>Sourdough Made Sweet</h1><div style="white-space:pre-wrap;line-height:1.7">${escapeHtml(text)}</div></div>`,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("Provider rejected notification");
    await db
      .update(orders)
      .set({ notificationStatus: "sent" })
      .where(eq(orders.id, id));
  } catch {
    await db
      .update(orders)
      .set({ notificationStatus: "failed" })
      .where(eq(orders.id, id));
  }
}
export async function prepareRetry(db: DB, id: string) {
  await db
    .update(orders)
    .set({ notificationAttempt: sql`${orders.notificationAttempt}+1` })
    .where(and(eq(orders.id, id), eq(orders.notificationStatus, "failed")));
}
