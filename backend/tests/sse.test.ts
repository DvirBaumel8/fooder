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

describe("SSE broadcast wiring", () => {
  it("broadcasts list-changed after adding an item", async () => {
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();
    await request(app).post("/api/list").send({ name: "תה", shopId: shop.id });

    expect(broadcastListChanged).toHaveBeenCalled();
  });
});
