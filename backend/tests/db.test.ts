import { describe, it, expect } from "vitest";
import { prisma } from "../src/db.js";

describe("Prisma schema", () => {
  it("creates and reads a product", async () => {
    const product = await prisma.product.create({
      data: { name: "חלב" },
    });

    const found = await prisma.product.findUnique({ where: { id: product.id } });
    expect(found?.name).toBe("חלב");
    expect(found?.timesAdded).toBe(0);
  });
});
