import { Router, Response } from "express";

const clients = new Set<Response>();

export const eventsRouter = Router();

eventsRouter.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
});

export function broadcastListChanged(): void {
  for (const client of clients) {
    client.write(`event: list-changed\ndata: {}\n\n`);
  }
}
