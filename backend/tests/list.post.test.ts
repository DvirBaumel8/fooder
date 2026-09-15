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

  it("does not create a duplicate active item for the same product and shop", async () => {
    const product = await prisma.product.create({ data: { name: "קוטג׳" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();

    const first = await request(app)
      .post("/api/list")
      .send({ productId: product.id, quantity: "1", shopId: shop.id });
    const second = await request(app)
      .post("/api/list")
      .send({ productId: product.id, quantity: "2", shopId: shop.id });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(await prisma.shoppingListItem.count()).toBe(1);
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

  it("allows the same product to appear on two different shops' lists at once", async () => {
    const product = await prisma.product.create({ data: { name: "חלב" } });
    const shopA = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const shopB = await prisma.shop.create({ data: { name: "גוד פארם" } });
    const app = createApp();

    const resA = await request(app)
      .post("/api/list")
      .send({ productId: product.id, quantity: "1", shopId: shopA.id });
    const resB = await request(app)
      .post("/api/list")
      .send({ productId: product.id, quantity: "1", shopId: shopB.id });

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);

    const listRes = await request(app).get("/api/list");
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(2);

    const shopIds = listRes.body.map((item: { shop: { id: string } }) => item.shop.id).sort();
    expect(shopIds).toEqual([shopA.id, shopB.id].sort());
  });
});
