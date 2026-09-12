import { Router } from "express";
import { prisma } from "../db.js";
import { broadcastListChanged } from "../sse.js";

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

  broadcastListChanged();
  res.status(201).json(item);
});

listRouter.patch("/:id", async (req, res) => {
  const { quantity, note } = req.body ?? {};

  const existing = await prisma.shoppingListItem.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) {
    res.status(404).json({ error: "item not found" });
    return;
  }

  const item = await prisma.shoppingListItem.update({
    where: { id: req.params.id },
    data: { quantity, note },
    include: {
      product: { select: { id: true, name: true, category: true, photoUrl: true } },
    },
  });

  broadcastListChanged();
  res.json(item);
});

listRouter.post("/:id/complete", async (req, res) => {
  const item = await prisma.shoppingListItem.findUnique({
    where: { id: req.params.id },
  });
  if (!item) {
    res.status(404).json({ error: "item not found" });
    return;
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: item.productId },
      data: { timesAdded: { increment: 1 }, lastAddedAt: new Date() },
    }),
    prisma.shoppingListItem.delete({ where: { id: item.id } }),
  ]);

  broadcastListChanged();
  res.status(204).send();
});

listRouter.delete("/:id", async (req, res) => {
  const item = await prisma.shoppingListItem.findUnique({
    where: { id: req.params.id },
  });
  if (!item) {
    res.status(404).json({ error: "item not found" });
    return;
  }

  await prisma.shoppingListItem.delete({ where: { id: item.id } });
  broadcastListChanged();
  res.status(204).send();
});
