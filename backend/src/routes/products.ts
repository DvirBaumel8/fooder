import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { prisma } from "../db.js";
import { uploadPhoto } from "../lib/r2.js";
import { broadcastListChanged } from "../sse.js";

export const productsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

productsRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const products = await prisma.product.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: [{ lastAddedAt: "desc" }, { timesAdded: "desc" }],
    take: 20,
  });

  res.json(products);
});

productsRouter.post("/:id/photo", upload.single("photo"), async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) {
    res.status(404).json({ error: "product not found" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "photo file is required" });
    return;
  }

  const key = `products/${product.id}/${randomUUID()}`;
  const photoUrl = await uploadPhoto(key, req.file.buffer, req.file.mimetype);

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { photoUrl },
  });

  broadcastListChanged();
  res.json(updated);
});
