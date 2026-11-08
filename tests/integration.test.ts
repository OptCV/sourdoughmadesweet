import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { app } from "../server/api";
import { connect } from "../server/db/connect";
import { auth } from "../server/auth";
import type { Env } from "../server/env";
import type { Catalog } from "../shared/contracts";
import { defaultAppearance } from "../shared/appearance";
import { eq } from "drizzle-orm";
import * as s from "../server/db/schema";
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)(
  "PostgreSQL integration (dedicated seeded test database only)",
  () => {
    const env = {
      HYPERDRIVE: { connectionString: url },
      BETTER_AUTH_URL: "http://localhost:8788",
      BETTER_AUTH_SECRET: "integration-only-" + crypto.randomUUID(),
      OWNER_EMAIL: `owner-${crypto.randomUUID()}@example.com`,
      APP_ENV: "development",
    } as Env;
    let cookie = "";
    let data: Catalog;
    let savedId = "";
    let categoryId = "";
    let productId = "";
    let userId = "";
    const password = crypto.randomUUID() + crypto.randomUUID();
    const testIp = `test-${crypto.randomUUID()}`;
    const request = (
      path: string,
      method = "GET",
      body?: unknown,
      authorized = false,
    ) =>
      app.request(
        `http://localhost:8788/api${path}`,
        {
          method,
          headers: {
            Origin: env.BETTER_AUTH_URL,
            "cf-connecting-ip": testIp,
            "Content-Type": "application/json",
            ...(authorized ? { Cookie: cookie } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
        env,
      );
    beforeAll(async () => {
      const { db, pool } = connect(url!);
      try {
        const owner = await auth(db, env, true).api.signUpEmail({
          body: { name: "Test owner", email: env.OWNER_EMAIL, password },
        });
        userId = owner.user.id;
      } finally {
        await pool.end();
      }
      const response = await request("/auth/sign-in/email", "POST", {
        email: env.OWNER_EMAIL,
        password,
      });
      expect(response.status).toBe(200);
      cookie = response.headers.get("set-cookie")!.split(";")[0];
      data = (await (await request("/catalog")).json()) as Catalog;
    });
    afterAll(async () => {
      const { db, pool } = connect(url!);
      try {
        if (data)
          await db
            .update(s.settings)
            .set({ value: data.settings })
            .where(eq(s.settings.id, 1));
        if (savedId) {
          await db
            .delete(s.orderItems)
            .where(eq(s.orderItems.orderId, savedId));
          await db.delete(s.orders).where(eq(s.orders.id, savedId));
        }
        if (productId) {
          await db
            .delete(s.variants)
            .where(eq(s.variants.productId, productId));
          await db.delete(s.products).where(eq(s.products.id, productId));
        }
        if (categoryId)
          await db.delete(s.categories).where(eq(s.categories.id, categoryId));
        if (userId) await db.delete(s.user).where(eq(s.user.id, userId));
      } finally {
        await pool.end();
      }
    });
    it("rejects every unauthenticated admin resource and cross-origin mutations", async () => {
      for (const path of [
        "/admin/catalog",
        "/admin/categories",
        "/admin/products",
        "/admin/orders",
        "/admin/media",
        "/admin/settings",
      ])
        expect((await request(path)).status).toBe(401);
      const cross = await app.request(
        "http://localhost:8788/api/admin/categories",
        {
          method: "POST",
          headers: { Origin: "https://evil.example", Cookie: cookie },
        },
        env,
      );
      expect(cross.status).toBe(403);
      expect(
        (
          await request("/auth/sign-up/email", "POST", {
            name: "Intruder",
            email: "intruder@example.com",
            password,
          })
        ).status,
      ).not.toBe(200);
    });
    it("creates, updates and archives real categories and product variants", async () => {
      const category = {
        name: "Integration category",
        slug: "integration-" + crypto.randomUUID(),
        theme: "cream",
        displayOrder: 100,
        isActive: true,
        description: "",
      };
      const response = await request(
        "/admin/categories",
        "POST",
        category,
        true,
      );
      expect(response.status).toBe(201);
      categoryId = ((await response.json()) as { id: string }).id;
      const product = {
        name: "Integration loaf",
        slug: "integration-" + crypto.randomUUID(),
        categoryId,
        availabilityStatus: "available",
        variants: [
          {
            name: "Each",
            priceCents: 1234,
            unitCount: 1,
            isAvailable: true,
            displayOrder: 0,
          },
        ],
      };
      const created = await request("/admin/products", "POST", product, true);
      expect(created.status).toBe(200);
      productId = ((await created.json()) as { id: string }).id;
      const catalog = (await (
        await request("/admin/catalog", "GET", undefined, true)
      ).json()) as Catalog;
      const p = catalog.products.find((p) => p.id === productId)!;
      expect(p.variants[0].priceCents).toBe(1234);
      p.variants[0].priceCents = 1500;
      expect(
        (await request(`/admin/products/${productId}`, "PATCH", p, true))
          .status,
      ).toBe(200);
      expect(
        (
          await request(
            `/admin/products/${productId}`,
            "DELETE",
            undefined,
            true,
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await request(
            `/admin/categories/${categoryId}`,
            "DELETE",
            undefined,
            true,
          )
        ).status,
      ).toBe(200);
      const publicData = (await (await request("/catalog")).json()) as Catalog;
      expect(publicData.products.some((p) => p.id === productId)).toBe(false);
    });
    it("persists branding and rejects missing or still-referenced background media", async () => {
      const appearance = {
        ...defaultAppearance,
        primary: "#193A55",
        heroHeading: "A new chapter for our bakery",
      };
      expect(
        (
          await request(
            "/admin/settings",
            "PATCH",
            { ...data.settings, appearance },
            true,
          )
        ).status,
      ).toBe(200);
      const updated = (await (await request("/catalog")).json()) as Catalog;
      expect(updated.settings.appearance).toEqual(appearance);
      expect(
        (
          await request(
            "/admin/settings",
            "PATCH",
            {
              ...data.settings,
              appearance: {
                ...appearance,
                heroBackground: {
                  backgroundColor: null,
                  backgroundImageId: crypto.randomUUID(),
                },
              },
            },
            true,
          )
        ).status,
      ).toBe(400);
      const { db, pool } = connect(url!);
      let imageId = "";
      try {
        const [image] = await db
          .insert(s.media)
          .values({
            r2ObjectKey: crypto.randomUUID(),
            filename: "background.png",
            mimeType: "image/png",
            sizeBytes: 100,
            altText: "Background",
          })
          .returning();
        imageId = image.id;
        const category = {
          name: "Visual test",
          slug: "visual-" + crypto.randomUUID(),
          theme: "gold",
          style: { backgroundColor: "#AABBCC", backgroundImageId: imageId },
          isActive: false,
        };
        expect(
          (
            await request(
              `/admin/categories/${categoryId}`,
              "PATCH",
              category,
              true,
            )
          ).status,
        ).toBe(200);
        expect(
          (await request(`/admin/media/${imageId}`, "DELETE", undefined, true))
            .status,
        ).toBe(409);
        const admin = (await (
          await request("/admin/catalog", "GET", undefined, true)
        ).json()) as Catalog;
        expect(
          admin.categories.find((c) => c.id === categoryId)?.style,
        ).toEqual(category.style);
        await request(
          `/admin/categories/${categoryId}`,
          "PATCH",
          { ...category, style: null },
          true,
        );
        await request(
          "/admin/settings",
          "PATCH",
          {
            ...data.settings,
            appearance: {
              ...appearance,
              heroBackground: {
                backgroundColor: null,
                backgroundImageId: imageId,
              },
            },
          },
          true,
        );
        expect(
          (await request(`/admin/media/${imageId}`, "DELETE", undefined, true))
            .status,
        ).toBe(409);
      } finally {
        await db
          .update(s.settings)
          .set({ value: data.settings })
          .where(eq(s.settings.id, 1));
        await db
          .update(s.categories)
          .set({ style: null })
          .where(eq(s.categories.id, categoryId));
        if (imageId) await db.delete(s.media).where(eq(s.media.id, imageId));
        await pool.end();
      }
    });
    it("persists navigation preferences and preserves them for older settings clients", async () => {
      const navigation = {
        menuLabel: "Fresh from the oven",
        shortcutCategoryIds: data.categories.slice(0, 2).map((c) => c.id),
      };
      expect(
        (
          await request(
            "/admin/settings",
            "PATCH",
            { ...data.settings, navigation },
            true,
          )
        ).status,
      ).toBe(200);
      const updated = (await (await request("/catalog")).json()) as Catalog;
      expect(updated.settings.navigation).toEqual(navigation);
      expect(
        (
          await request(
            "/admin/settings",
            "PATCH",
            { ...data.settings, navigation: undefined },
            true,
          )
        ).status,
      ).toBe(200);
      const retained = (await (await request("/catalog")).json()) as Catalog;
      expect(retained.settings.navigation).toEqual(navigation);
      expect(
        (
          await request(
            "/admin/settings",
            "PATCH",
            { ...data.settings, navigation: { ...navigation, menuLabel: " " } },
            true,
          )
        ).status,
      ).toBe(400);
    });
    it("persists an immutable order, survives email failure and deduplicates retries", async () => {
      const p = data.products.find(
        (p) => p.availabilityStatus === "available" && p.variants.length,
      )!;
      const payload = {
        idempotencyKey: crypto.randomUUID(),
        customerName: "Integration customer",
        customerEmail: "customer@example.com",
        customerPhone: "5551234567",
        customerType: "new",
        preferredContactMethod: "email",
        fulfillmentMethod: "pickup",
        requestedDate: "2027-01-10",
        acknowledgment: true,
        items: [{ productId: p.id, variantId: p.variants[0].id, quantity: 2 }],
      };
      const first = await request("/orders", "POST", payload);
      expect(first.status).toBe(201);
      const result = (await first.json()) as {
        reference: string;
        notificationStatus: string;
      };
      expect(result.notificationStatus).toBe("failed");
      const retry = (await (
        await request("/orders", "POST", payload)
      ).json()) as { reference: string };
      expect(retry.reference).toBe(result.reference);
      expect(
        (
          await request("/orders", "POST", {
            ...payload,
            customerName: "Changed",
          })
        ).status,
      ).toBe(409);
      const requests = (await (
        await request("/admin/orders", "GET", undefined, true)
      ).json()) as { id: string; reference: string }[];
      const matches = requests.filter((o) => o.reference === result.reference);
      expect(matches).toHaveLength(1);
      savedId = matches[0].id;
      const detail = (await (
        await request(`/admin/orders/${savedId}`, "GET", undefined, true)
      ).json()) as {
        subtotalCents: number;
        items: { productNameSnapshot: string }[];
      };
      expect(detail.subtotalCents).toBe(p.variants[0].priceCents * 2);
      expect(detail.items[0].productNameSnapshot).toBe(p.name);
      expect(
        (
          await request(
            `/admin/orders/${savedId}`,
            "PATCH",
            { status: "contacted" },
            true,
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await request(
            `/admin/orders/${savedId}/retry-notification`,
            "POST",
            {},
            true,
          )
        ).status,
      ).toBe(200);
    });
  },
);
