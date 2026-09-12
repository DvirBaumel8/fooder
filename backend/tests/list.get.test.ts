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

  it("returns items with their product info", async () => {
    const product = await prisma.product.create({
      data: { name: "חלב", category: "מוצרי חלב" },
    });
    await prisma.shoppingListItem.create({
      data: { productId: product.id, quantity: "2" },
    });

    const app = createApp();
    const res = await request(app).get("/api/list");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].quantity).toBe("2");
    expect(res.body[0].product.name).toBe("חלב");
  });
});
