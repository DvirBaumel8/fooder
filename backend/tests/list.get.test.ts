import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("GET /api/list", () => {
  it("returns an empty list when nothing has been added", async () => {
    const app = createApp();
    const res = await request(app).get("/api/list");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns items with their product and shop info", async () => {
    const product = await prisma.product.create({
      data: { name: "חלב", category: "מוצרי חלב" },
    });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id, quantity: "2" },
    });

    const app = createApp();
    const res = await request(app).get("/api/list");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].quantity).toBe("2");
    expect(res.body[0].product.name).toBe("חלב");
    expect(res.body[0].shop.name).toBe("סופרמרקט");
  });

  it("hides legacy duplicate rows for the same product and shop", async () => {
    const product = await prisma.product.create({ data: { name: "קוטג׳" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    await prisma.shoppingListItem.createMany({
      data: [
        { productId: product.id, shopId: shop.id, quantity: "1" },
        { productId: product.id, shopId: shop.id, quantity: "2" },
      ],
    });

    const app = createApp();
    const res = await request(app).get("/api/list");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].product.name).toBe("קוטג׳");
  });
});
