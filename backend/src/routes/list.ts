import { Router } from "express";
import { prisma } from "../db.js";

export const listRouter = Router();

listRouter.get("/", async (_req, res) => {
  const items = await prisma.shoppingListItem.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        select: { id: true, name: true, category: true, photoUrl: true },
      },
    },
  });
  res.json(items);
});

listRouter.post("/", async (req, res) => {
  const { productId, name, category, quantity, note } = req.body ?? {};

  if (!productId && !name) {
    res.status(400).json({ error: "productId or name is required" });
    return;
  }

  const product = productId
    ? await prisma.product.findUnique({ where: { id: productId } })
    : await prisma.product.create({
        data: { name: String(name).trim(), category: category?.trim() || undefined },
      });

  if (!product) {
    res.status(404).json({ error: "product not found" });
    return;
  }

  const item = await prisma.shoppingListItem.create({
    data: { productId: product.id, quantity, note },
    include: {
      product: { select: { id: true, name: true, category: true, photoUrl: true } },
    },
  });

  res.status(201).json(item);
});
