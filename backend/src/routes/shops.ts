import { Router } from "express";
import { prisma } from "../db.js";
import { broadcastListChanged } from "../sse.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const shopsRouter = Router();

shopsRouter.get("/", asyncHandler(async (_req, res) => {
  const shops = await prisma.shop.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  res.json(shops);
}));

shopsRouter.post("/", asyncHandler(async (req, res) => {
  const { name } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const shop = await prisma.shop.create({
    data: { name: name.trim() },
  });

  broadcastListChanged();
  res.status(201).json(shop);
}));
