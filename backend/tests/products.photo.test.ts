import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

vi.mock("../src/lib/r2.js", () => ({
  uploadPhoto: vi.fn(async (key: string) => `https://fake-cdn.example/${key}`),
}));

describe("POST /api/products/:id/photo", () => {
  it("uploads a photo and stores the URL", async () => {
    const product = await prisma.product.create({ data: { name: "חלב" } });
    const app = createApp();

    const res = await request(app)
      .post(`/api/products/${product.id}/photo`)
      .attach("photo", Buffer.from("fake-image-bytes"), "milk.jpg");

    expect(res.status).toBe(200);
    expect(res.body.photoUrl).toMatch(/^https:\/\/fake-cdn\.example\//);
  });

  it("returns 400 when no file is attached", async () => {
    const product = await prisma.product.create({ data: { name: "קפה" } });
    const app = createApp();

    const res = await request(app).post(`/api/products/${product.id}/photo`);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a missing product", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/products/does-not-exist/photo")
      .attach("photo", Buffer.from("fake-image-bytes"), "milk.jpg");
    expect(res.status).toBe(404);
  });

  it("returns 500 with a clean JSON error when the upload fails, without crashing", async () => {
    const { uploadPhoto } = await import("../src/lib/r2.js");
    (uploadPhoto as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      throw new Error("R2 unreachable");
    });

    const product = await prisma.product.create({ data: { name: "תה" } });
    const app = createApp();

    const res = await request(app)
      .post(`/api/products/${product.id}/photo`)
      .attach("photo", Buffer.from("fake-image-bytes"), "milk.jpg");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "photo upload failed" });
  });
});
