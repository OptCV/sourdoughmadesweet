import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, eq, sql, desc, lt } from "drizzle-orm";
import { z } from "zod";
import type { Env } from "./env";
import { connect, type DB } from "./db/connect";
import * as s from "./db/schema";
import { auth } from "./auth";
import { catalog } from "./db/catalog";
import {
  categoryInput,
  productInput,
  flightInput,
  settingsInput,
  orderInput,
  statuses,
} from "../shared/contracts";
import { priceOrder } from "./validation/pricing";
import { notifyOrder, prepareRetry } from "./email/notification";
import { verifyImage } from "./storage/images";
type Context = { Bindings: Env; Variables: { db: DB } };
export const app = new Hono<Context>();
const fail = (
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 503 = 400,
) => {
  throw new HTTPException(status, { message });
};
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
    c.req.header("Origin") !== new URL(c.env.BETTER_AUTH_URL).origin
  )
    return c.json({ error: "Invalid request origin" }, 403);
  const length = Number(c.req.header("content-length") ?? 0);
  if (length > (c.req.path === "/api/admin/media" ? 6 * 1024 * 1024 : 65536))
    return c.json({ error: "Request too large" }, 413);
  const { db, pool } = connect(c.env.HYPERDRIVE.connectionString);
  c.set("db", db);
  try {
    await next();
  } finally {
    await pool.end();
  }
});
async function boundedJson(request: Pick<Request, "body">) {
  const reader = request.body?.getReader();
  if (!reader) fail("Request body required");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    size += value.length;
    if (size > 65536) {
      await reader!.cancel();
      fail("Request too large", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    fail("Invalid JSON");
  }
}
async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function rate(db: DB, key: string, limit: number) {
  const now = new Date();
  await db.delete(s.rateLimits).where(lt(s.rateLimits.expiresAt, now));
  const [row] = await db
    .insert(s.rateLimits)
    .values({ key, count: 1, expiresAt: new Date(Date.now() + 600000) })
    .onConflictDoUpdate({
      target: s.rateLimits.key,
      set: { count: sql`${s.rateLimits.count}+1` },
    })
    .returning();
  if (row.count > limit)
    fail("Too many attempts. Please wait ten minutes.", 429);
}
app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  if (c.req.method === "POST") {
    await boundedJson(c.req.raw.clone());
    await rate(
      c.get("db"),
      await hash("auth" + (c.req.header("cf-connecting-ip") ?? "local")),
      20,
    );
  }
  return auth(c.get("db"), c.env).handler(c.req.raw);
});
app.use("/api/admin/*", async (c, next) => {
  const session = await auth(c.get("db"), c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) fail("Please sign in.", 401);
  if (
    !c.env.OWNER_EMAIL ||
    session!.user.email.toLowerCase() !== c.env.OWNER_EMAIL.toLowerCase()
  )
    fail("Owner access required.", 403);
  await next();
});
app.get("/api/catalog", async (c) => {
  const data = await catalog(c.get("db"));
  c.header("Cache-Control", "public, max-age=0, s-maxage=30");
  return c.json(data);
});
app.get("/api/categories", async (c) =>
  c.json((await catalog(c.get("db"))).categories),
);
app.get("/api/products", async (c) =>
  c.json((await catalog(c.get("db"))).products),
);
app.get("/api/products/:slug", async (c) => {
  const p = (await catalog(c.get("db"))).products.find(
    (p) => p.slug === c.req.param("slug"),
  );
  return p ? c.json(p) : c.json({ error: "Product not found" }, 404);
});
app.get("/api/media/:id", async (c) => {
  const id = z.uuid().parse(c.req.param("id"));
  const [image] = await c
    .get("db")
    .select()
    .from(s.media)
    .where(eq(s.media.id, id));
  if (!image) fail("Image not found", 404);
  const object = await c.env.PRODUCT_IMAGES.get(image.r2ObjectKey);
  if (!object) fail("Image not found", 404);
  return new Response(object!.body, {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public,max-age=86400",
      "X-Content-Type-Options": "nosniff",
      ETag: object!.httpEtag,
    },
  });
});
app.post("/api/orders", async (c) => {
  const input = orderInput.parse(await boundedJson(c.req.raw));
  const db = c.get("db");
  await rate(
    db,
    await hash("order" + (c.req.header("cf-connecting-ip") ?? "local")),
    10,
  );
  const requestHash = await hash(
    JSON.stringify({ ...input, turnstileToken: "" }),
  );
  const existing = await db
    .select()
    .from(s.orders)
    .where(eq(s.orders.idempotencyKey, input.idempotencyKey));
  if (existing[0]) {
    if (existing[0].requestHash !== requestHash)
      fail("This request changed. Start a new submission.", 409);
    return c.json({
      reference: existing[0].reference,
      notificationStatus: existing[0].notificationStatus,
    });
  }
  if (c.env.APP_ENV !== "development" || c.env.TURNSTILE_SECRET_KEY) {
    if (!c.env.TURNSTILE_SECRET_KEY)
      fail("Ordering is not configured yet. Please try again later.", 503);
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: c.env.TURNSTILE_SECRET_KEY!,
          response: input.turnstileToken,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const result = (await response.json()) as {
      success: boolean;
      hostname: string;
    };
    if (
      !result.success ||
      result.hostname !== new URL(c.env.BETTER_AUTH_URL).hostname
    )
      fail("Please complete the verification again.");
  }
  const saved = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7349831)`);
    const [old] = await tx
      .select()
      .from(s.orders)
      .where(eq(s.orders.idempotencyKey, input.idempotencyKey));
    if (old) {
      if (old.requestHash !== requestHash) fail("This request changed.", 409);
      return old;
    }
    let items;
    try {
      items = priceOrder(input, await catalog(tx as unknown as DB));
    } catch (e) {
      fail(e instanceof Error ? e.message : "Invalid order");
    }
    const {
      items: ignored,
      turnstileToken,
      website,
      acknowledgment,
      ...fields
    } = input;
    void ignored;
    void turnstileToken;
    void website;
    void acknowledgment;
    const [order] = await tx
      .insert(s.orders)
      .values({
        ...fields,
        requestHash,
        reference: `SMS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        subtotalCents: items!.reduce((sum, i) => sum + i.lineTotalCents, 0),
      })
      .returning();
    await tx
      .insert(s.orderItems)
      .values(items!.map((i) => ({ ...i, orderId: order.id })));
    return order;
  });
  await notifyOrder(db, c.env, saved.id);
  const [result] = await db
    .select()
    .from(s.orders)
    .where(eq(s.orders.id, saved.id));
  return c.json(
    {
      reference: result.reference,
      notificationStatus: result.notificationStatus,
    },
    201,
  );
});
app.get("/api/admin/catalog", async (c) =>
  c.json(await catalog(c.get("db"), true)),
);
app.get("/api/admin/categories", async (c) =>
  c.json((await catalog(c.get("db"), true)).categories),
);
app.get("/api/admin/products", async (c) =>
  c.json((await catalog(c.get("db"), true)).products),
);
app.post("/api/admin/categories", async (c) => {
  const input = categoryInput.parse(await boundedJson(c.req.raw));
  return c.json(
    (await c.get("db").insert(s.categories).values(input).returning())[0],
    201,
  );
});
app.patch("/api/admin/categories/:id", async (c) => {
  const input = categoryInput.parse(await boundedJson(c.req.raw));
  const [row] = await c
    .get("db")
    .update(s.categories)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(s.categories.id, z.uuid().parse(c.req.param("id"))))
    .returning();
  if (!row) fail("Category not found", 404);
  return c.json(row);
});
app.delete("/api/admin/categories/:id", async (c) => {
  await c
    .get("db")
    .update(s.categories)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(s.categories.id, z.uuid().parse(c.req.param("id"))));
  return c.json({ ok: true });
});
app.on(["POST", "PATCH"], "/api/admin/products/:id?", async (c) => {
  const { variants, ...input } = productInput.parse(
    await boundedJson(c.req.raw),
  );
  const id = c.req.param("id");
  const result = await c.get("db").transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7349831)`);
    for (const imageId of [
      input.primaryImageId,
      ...input.additionalImageIds,
    ].filter(Boolean)) {
      const [image] = await tx
        .select()
        .from(s.media)
        .where(eq(s.media.id, imageId!));
      if (!image) fail("Selected image no longer exists.");
    }
    const [row] = id
      ? await tx
          .update(s.products)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(s.products.id, z.uuid().parse(id)))
          .returning()
      : await tx.insert(s.products).values(input).returning();
    if (!row) fail("Product not found", 404);
    await tx
      .update(s.variants)
      .set({ isAvailable: false })
      .where(eq(s.variants.productId, row.id));
    for (const variant of variants) {
      if (variant.id) {
        const [updated] = await tx
          .update(s.variants)
          .set(variant)
          .where(
            and(
              eq(s.variants.id, variant.id),
              eq(s.variants.productId, row.id),
            ),
          )
          .returning();
        if (!updated) fail("Variant does not belong to this product");
      } else
        await tx.insert(s.variants).values({ ...variant, productId: row.id });
    }
    return row;
  });
  return c.json(result);
});
app.delete("/api/admin/products/:id", async (c) => {
  await c
    .get("db")
    .update(s.products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(s.products.id, z.uuid().parse(c.req.param("id"))));
  return c.json({ ok: true });
});
app.patch("/api/admin/flights/:id", async (c) => {
  const { eligibleProductIds, ...input } = flightInput.parse(
    await boundedJson(c.req.raw),
  );
  const id = z.uuid().parse(c.req.param("id"));
  await c.get("db").transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7349831)`);
    const cookies = await tx
      .select()
      .from(s.products)
      .where(eq(s.products.isCookieFlavor, true));
    if (
      eligibleProductIds.some(
        (id) => !cookies.some((p) => p.id === id && p.id !== input.productId),
      )
    )
      fail("Only cookie products may be selected as flight flavors.");
    await tx.update(s.flights).set(input).where(eq(s.flights.id, id));
    await tx.delete(s.flightEligible).where(eq(s.flightEligible.flightId, id));
    if (eligibleProductIds.length)
      await tx.insert(s.flightEligible).values(
        [...new Set(eligibleProductIds)].map((productId) => ({
          flightId: id,
          productId,
        })),
      );
  });
  return c.json({ ok: true });
});
app.get("/api/admin/settings", async (c) =>
  c.json((await catalog(c.get("db"), true)).settings),
);
app.patch("/api/admin/settings", async (c) => {
  const value = settingsInput.parse(await boundedJson(c.req.raw));
  await c
    .get("db")
    .update(s.settings)
    .set({ value })
    .where(eq(s.settings.id, 1));
  return c.json(value);
});
app.get("/api/admin/orders", async (c) =>
  c.json(
    await c
      .get("db")
      .select()
      .from(s.orders)
      .orderBy(desc(s.orders.createdAt))
      .limit(500),
  ),
);
app.get("/api/admin/orders/:id", async (c) => {
  const id = z.uuid().parse(c.req.param("id"));
  const [order] = await c
    .get("db")
    .select()
    .from(s.orders)
    .where(eq(s.orders.id, id));
  if (!order) fail("Order not found", 404);
  return c.json({
    ...order,
    items: await c
      .get("db")
      .select()
      .from(s.orderItems)
      .where(eq(s.orderItems.orderId, id)),
  });
});
app.patch("/api/admin/orders/:id", async (c) => {
  const input = z
    .object({ status: z.enum(statuses) })
    .parse(await boundedJson(c.req.raw));
  await c
    .get("db")
    .update(s.orders)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(s.orders.id, z.uuid().parse(c.req.param("id"))));
  return c.json({ ok: true });
});
app.post("/api/admin/orders/:id/retry-notification", async (c) => {
  const id = z.uuid().parse(c.req.param("id"));
  await prepareRetry(c.get("db"), id);
  await notifyOrder(c.get("db"), c.env, id);
  return c.json({ ok: true });
});
app.get("/api/admin/media", async (c) =>
  c.json(
    await c.get("db").select().from(s.media).orderBy(desc(s.media.createdAt)),
  ),
);
app.post("/api/admin/media", async (c) => {
  if (
    !c.req.header("content-length") ||
    Number(c.req.header("content-length")) > 6 * 1024 * 1024
  )
    fail("Upload exceeds size limit.", 413);
  const form = await c.req.formData();
  const file = form.get("file");
  const alt = z.string().trim().min(1).max(300).parse(form.get("altText"));
  if (!(file instanceof File)) fail("Choose an image.");
  const image = file as File;
  const bytes = new Uint8Array(await image.arrayBuffer());
  try {
    verifyImage(bytes, image.type);
  } catch (e) {
    fail((e as Error).message);
  }
  const key = `products/${crypto.randomUUID()}`;
  await c.env.PRODUCT_IMAGES.put(key, bytes, {
    httpMetadata: { contentType: image.type },
  });
  try {
    const [row] = await c
      .get("db")
      .insert(s.media)
      .values({
        r2ObjectKey: key,
        filename: image.name.slice(0, 200),
        mimeType: image.type,
        sizeBytes: bytes.length,
        altText: alt,
      })
      .returning();
    return c.json(row, 201);
  } catch (e) {
    await c.env.PRODUCT_IMAGES.delete(key);
    throw e;
  }
});
app.patch("/api/admin/media/:id", async (c) => {
  const input = z
    .object({ altText: z.string().trim().min(1).max(300) })
    .parse(await boundedJson(c.req.raw));
  const [image] = await c
    .get("db")
    .update(s.media)
    .set(input)
    .where(eq(s.media.id, z.uuid().parse(c.req.param("id"))))
    .returning();
  if (!image) fail("Image not found", 404);
  return c.json(image);
});
app.delete("/api/admin/media/:id", async (c) => {
  const id = z.uuid().parse(c.req.param("id"));
  await c.get("db").transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7349831)`);
    const all = await tx.select().from(s.products);
    if (
      all.some(
        (p) => p.primaryImageId === id || p.additionalImageIds.includes(id),
      )
    )
      fail("This image is still referenced by a product.", 409);
    const [image] = await tx
      .delete(s.media)
      .where(eq(s.media.id, id))
      .returning();
    if (image) await c.env.PRODUCT_IMAGES.delete(image.r2ObjectKey);
  });
  return c.json({ ok: true });
});
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((error, c) => {
  if (error instanceof z.ZodError)
    return c.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      400,
    );
  if (error instanceof HTTPException)
    return c.json({ error: error.message }, error.status);
  return c.json(
    { error: "The service is temporarily unavailable. Please try again." },
    503,
  );
});
