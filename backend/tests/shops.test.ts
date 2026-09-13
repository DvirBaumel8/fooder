import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../src/sse.js", async () => {
  const actual = await vi.importActual<typeof import("../src/sse.js")>("../src/sse.js");
  return {
    ...actual,
    broadcastListChanged: vi.fn(),
  };
});

import { createApp } from "../src/app.js";
import { broadcastListChanged } from "../src/sse.js";
import { prisma } from "../src/db.js";

describe("GET /api/shops", () => {
  it("returns shops ordered by creation time", async () => {
    const first = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const second = await prisma.shop.create({ data: { name: "גוד פארם" } });

    const app = createApp();
    const res = await request(app).get("/api/shops");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe(first.id);
    expect(res.body[1].id).toBe(second.id);
  });
});

describe("POST /api/shops", () => {
  it("creates a new shop and broadcasts the change", async () => {
    const app = createApp();
    const res = await request(app).post("/api/shops").send({ name: "סופר-פארם" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("סופר-פארם");
    expect(broadcastListChanged).toHaveBeenCalled();

    const shops = await prisma.shop.findMany();
    expect(shops).toHaveLength(1);
  });

  it("returns 400 when name is missing", async () => {
    const app = createApp();
    const res = await request(app).post("/api/shops").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is blank", async () => {
    const app = createApp();
    const res = await request(app).post("/api/shops").send({ name: "   " });
    expect(res.status).toBe(400);
  });

  it("trims surrounding whitespace from the name before storing it", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/shops")
      .send({ name: "  סופר-פארם  " });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("סופר-פארם");
  });

  it("returns 400 when name is not a string", async () => {
    const app = createApp();
    const res = await request(app).post("/api/shops").send({ name: 42 });
    expect(res.status).toBe(400);
  });
});
