import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/db.js";

beforeEach(async () => {
  await prisma.shoppingListItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.shop.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
