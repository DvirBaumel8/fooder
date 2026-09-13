import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("async route error handling", () => {
  it("returns a clean 500 instead of crashing when a Prisma call rejects", async () => {
    const product = await prisma.product.create({ data: { name: "עגבניות" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id, quantity: "1" },
    });

    const originalDelete = prisma.shoppingListItem.delete;
    prisma.shoppingListItem.delete = vi
      .fn()
      .mockRejectedValueOnce(new Error("simulated race")) as typeof originalDelete;

    try {
      const app = createApp();
      const res = await request(app).delete(`/api/list/${item.id}`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "internal error" });
    } finally {
      prisma.shoppingListItem.delete = originalDelete;
    }
  });

  it("keeps serving requests normally after a handler error (process is still alive)", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("still works for a normal delete flow after a previous request errored", async () => {
    const product = await prisma.product.create({ data: { name: "מלפפון" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id, quantity: "2" },
    });

    const app = createApp();
    const res = await request(app).delete(`/api/list/${item.id}`);

    expect(res.status).toBe(204);

    const remaining = await prisma.shoppingListItem.findUnique({ where: { id: item.id } });
    expect(remaining).toBeNull();
  });
});
