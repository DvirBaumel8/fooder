import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("GET /api/products", () => {
  it("filters by name, case-insensitively", async () => {
    await prisma.product.create({ data: { name: "חלב תנובה" } });
    await prisma.product.create({ data: { name: "קפה" } });

    const app = createApp();
    const res = await request(app).get("/api/products?q=חלב");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("חלב תנובה");
  });

  it("orders by most recently added first", async () => {
    const older = await prisma.product.create({
      data: { name: "א", lastAddedAt: new Date("2026-01-01") },
    });
    const newer = await prisma.product.create({
      data: { name: "ב", lastAddedAt: new Date("2026-02-01") },
    });

    const app = createApp();
    const res = await request(app).get("/api/products");

    expect(res.body[0].id).toBe(newer.id);
    expect(res.body[1].id).toBe(older.id);
  });

  it("sorts never-bought products (lastAddedAt: null) after ones with a real date", async () => {
    const neverBought = await prisma.product.create({
      data: { name: "ג", lastAddedAt: null },
    });
    const bought = await prisma.product.create({
      data: { name: "ד", lastAddedAt: new Date("2026-01-01") },
    });

    const app = createApp();
    const res = await request(app).get("/api/products");

    const boughtIndex = res.body.findIndex((p: { id: string }) => p.id === bought.id);
    const neverBoughtIndex = res.body.findIndex((p: { id: string }) => p.id === neverBought.id);

    expect(boughtIndex).toBeGreaterThanOrEqual(0);
    expect(neverBoughtIndex).toBeGreaterThan(boughtIndex);
  });
});
