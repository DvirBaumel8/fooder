import express, { Express } from "express";
import cors from "cors";
import { listRouter } from "./routes/list.js";
import { productsRouter } from "./routes/products.js";
import { eventsRouter } from "./sse.js";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/list", listRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/events", eventsRouter);

  return app;
}
