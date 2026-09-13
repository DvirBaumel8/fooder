import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import { listRouter } from "./routes/list.js";
import { productsRouter } from "./routes/products.js";
import { shopsRouter } from "./routes/shops.js";
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
  app.use("/api/shops", shopsRouter);
  app.use("/api/events", eventsRouter);

  // Terminal error handler: must be registered last, and must take 4 args so
  // Express recognizes it as an error-handling middleware. Without this,
  // an error passed via next(err) (e.g. from asyncHandler) would fall through
  // to Express's default handler; with it, we guarantee a clean JSON response
  // and prevent an unhandled rejection from ever reaching the process.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "internal error" });
    }
  });

  return app;
}
