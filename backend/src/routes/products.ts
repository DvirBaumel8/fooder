import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { prisma } from "../db.js";
import { uploadPhoto } from "../lib/r2.js";
import { broadcastListChanged } from "../sse.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const productsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

productsRouter.get("/", asyncHandler(async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const products = await prisma.product.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: [{ lastAddedAt: { sort: "desc", nulls: "last" } }, { timesAdded: "desc" }],
    take: 20,
  });

  res.json(products);
}));

productsRouter.post("/:id/photo", upload.single("photo"), asyncHandler(async (req, res) => {
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

  try {
    const photoUrl = await uploadPhoto(key, req.file.buffer, req.file.mimetype);

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { photoUrl },
    });

    broadcastListChanged();
    res.json(updated);
  } catch (err) {
    console.error("photo upload failed", { productId: product.id, key }, err);
    res.status(500).json({ error: "photo upload failed" });
  }
}));
