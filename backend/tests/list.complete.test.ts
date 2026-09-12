import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("POST /api/list/:id/complete", () => {
  it("removes the item and updates product history stats", async () => {
    const product = await prisma.product.create({ data: { name: "עגבניות" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, quantity: "1" },
    });

    const app = createApp();
    const res = await request(app).post(`/api/list/${item.id}/complete`);
    expect(res.status).toBe(204);

    const remaining = await prisma.shoppingListItem.findUnique({ where: { id: item.id } });
    expect(remaining).toBeNull();

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.timesAdded).toBe(1);
    expect(updatedProduct?.lastAddedAt).not.toBeNull();
  });

  it("returns 404 for a missing item", async () => {
    const app = createApp();
    const res = await request(app).post("/api/list/does-not-exist/complete");
    expect(res.status).toBe(404);
  });
});
