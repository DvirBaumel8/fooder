import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("PATCH /api/list/:id", () => {
  it("updates quantity and note", async () => {
    const product = await prisma.product.create({ data: { name: "לחם" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id, quantity: "1" },
    });

    const app = createApp();
    const res = await request(app)
      .patch(`/api/list/${item.id}`)
      .send({ quantity: "2", note: "כוסמין" });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe("2");
    expect(res.body.note).toBe("כוסמין");
  });

  it("returns 404 for a missing item", async () => {
    const app = createApp();
    const res = await request(app)
      .patch("/api/list/does-not-exist")
      .send({ quantity: "2" });
    expect(res.status).toBe(404);
  });
});
