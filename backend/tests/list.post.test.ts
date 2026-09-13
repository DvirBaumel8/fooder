import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("POST /api/list", () => {
  it("creates a new product and list item when given a name", async () => {
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();
    const res = await request(app)
      .post("/api/list")
      .send({ name: "חלב", category: "מוצרי חלב", quantity: "2", shopId: shop.id });

    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe("2");
    expect(res.body.product.name).toBe("חלב");
    expect(res.body.shop.id).toBe(shop.id);

    const products = await prisma.product.findMany();
    expect(products).toHaveLength(1);
  });

  it("reuses an existing product when given a productId", async () => {
    const product = await prisma.product.create({ data: { name: "ביצים" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();

    const res = await request(app)
      .post("/api/list")
      .send({ productId: product.id, quantity: "12", shopId: shop.id });

    expect(res.status).toBe(201);
    expect(res.body.product.id).toBe(product.id);

    const products = await prisma.product.findMany();
    expect(products).toHaveLength(1);
  });

  it("returns 400 when neither productId nor name is given", async () => {
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();
    const res = await request(app).post("/api/list").send({ quantity: "1", shopId: shop.id });
    expect(res.status).toBe(400);
  });

  it("returns 404 when productId does not exist", async () => {
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();
    const res = await request(app)
      .post("/api/list")
      .send({ productId: "does-not-exist", shopId: shop.id });
    expect(res.status).toBe(404);
  });

  it("returns 400 when shopId is missing", async () => {
    const app = createApp();
    const res = await request(app).post("/api/list").send({ name: "לחם" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when shopId does not exist", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/list")
      .send({ name: "לחם", shopId: "does-not-exist" });
    expect(res.status).toBe(404);
  });
});
