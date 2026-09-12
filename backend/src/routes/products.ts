import { Router } from "express";
import { prisma } from "../db.js";

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const products = await prisma.product.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: [{ lastAddedAt: "desc" }, { timesAdded: "desc" }],
    take: 20,
  });

  res.json(products);
});
