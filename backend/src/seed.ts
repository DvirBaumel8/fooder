import { prisma } from "./db.js";

const DEFAULT_SHOPS = ["ניצת הדובדבן"];

export async function ensureDefaultShops(): Promise<void> {
  for (const name of DEFAULT_SHOPS) {
    const existing = await prisma.shop.findFirst({ where: { name } });
    if (!existing) {
      await prisma.shop.create({ data: { name } });
    }
  }
}
