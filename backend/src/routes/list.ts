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
