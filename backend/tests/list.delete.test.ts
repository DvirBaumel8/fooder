import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("DELETE /api/list/:id", () => {
  it("removes the item without touching product history stats", async () => {
    const product = await prisma.product.create({ data: { name: "מלפפון" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id },
    });

    const app = createApp();
    const res = await request(app).delete(`/api/list/${item.id}`);
    expect(res.status).toBe(204);

    const remaining = await prisma.shoppingListItem.findUnique({ where: { id: item.id } });
    expect(remaining).toBeNull();

    const untouchedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(untouchedProduct?.timesAdded).toBe(0);
    expect(untouchedProduct?.lastAddedAt).toBeNull();
  });

  it("returns 404 for a missing item", async () => {
    const app = createApp();
    const res = await request(app).delete("/api/list/does-not-exist");
    expect(res.status).toBe(404);
  });
});
