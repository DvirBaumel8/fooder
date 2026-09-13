import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("async route error handling", () => {
  it("returns a clean 500 instead of crashing when a Prisma call rejects", async () => {
    const product = await prisma.product.create({ data: { name: "עגבניות" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, quantity: "1" },
    });

    // Simulate a real-world race: someone else already deleted the row
    // (or a transient DB error) between our existence check and the delete.
    // Prisma's model delegates (prisma.shoppingListItem) are Proxy-based,
    // and vi.spyOn(...).mockRestore()/vi.restoreAllMocks() has been observed
    // to corrupt them (the method stops being callable afterwards) instead
    // of cleanly restoring the original. So we capture the original
    // reference ourselves and restore it manually in a finally block.
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
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, quantity: "2" },
    });

    const app = createApp();
    const res = await request(app).delete(`/api/list/${item.id}`);

    expect(res.status).toBe(204);

    const remaining = await prisma.shoppingListItem.findUnique({ where: { id: item.id } });
    expect(remaining).toBeNull();
  });
});
