import { Router } from "express";
import { prisma } from "../db.js";
import { broadcastListChanged } from "../sse.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const listRouter = Router();

listRouter.get("/", asyncHandler(async (_req, res) => {
  const items = await prisma.shoppingListItem.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        select: { id: true, name: true, category: true, photoUrl: true },
      },
      shop: {
        select: { id: true, name: true },
      },
    },
  });
  const uniqueItems = items.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.productId === item.productId && candidate.shopId === item.shopId) === index
  );
  res.json(uniqueItems);
}));

listRouter.post("/", asyncHandler(async (req, res) => {
  const { productId, name, category, quantity, note, shopId } = req.body ?? {};

  if (!productId && !name) {
    res.status(400).json({ error: "productId or name is required" });
    return;
  }

  if (!shopId) {
    res.status(400).json({ error: "shopId is required" });
    return;
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) {
    res.status(404).json({ error: "shop not found" });
    return;
  }

  const normalizedName = typeof name === "string" ? name.trim() : "";
  const product = productId
    ? await prisma.product.findUnique({ where: { id: productId } })
    : await prisma.product.findFirst({ where: { name: normalizedName } }) ??
      await prisma.product.create({
        data: { name: normalizedName, category: category?.trim() || undefined },
      });

  if (!product) {
    res.status(404).json({ error: "product not found" });
    return;
  }

  const existingItem = await prisma.shoppingListItem.findFirst({
    where: { productId: product.id, shopId: shop.id },
    include: {
      product: { select: { id: true, name: true, category: true, photoUrl: true } },
      shop: { select: { id: true, name: true } },
    },
  });
  if (existingItem) {
    res.status(200).json(existingItem);
    return;
  }

  const item = await prisma.shoppingListItem.create({
    data: { productId: product.id, shopId: shop.id, quantity, note },
    include: {
      product: { select: { id: true, name: true, category: true, photoUrl: true } },
      shop: { select: { id: true, name: true } },
    },
  });

  broadcastListChanged();
  res.status(201).json(item);
}));

listRouter.patch("/:id", asyncHandler(async (req, res) => {
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
      shop: { select: { id: true, name: true } },
    },
  });

  broadcastListChanged();
  res.json(item);
}));

listRouter.post("/:id/complete", asyncHandler(async (req, res) => {
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
}));

listRouter.delete("/:id", asyncHandler(async (req, res) => {
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
}));
