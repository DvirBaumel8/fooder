# Shop-Categorized Shopping Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organize the shared shopping list by shop (סופרמרקט, גוד פארם, סופר-פארם, plus any the user adds), so each shopping trip only shows what's relevant to that store.

**Architecture:** Add a `Shop` table and a required `shopId` foreign key on `ShoppingListItem`. Two new endpoints (`GET`/`POST /api/shops`) manage the shop list; `GET`/`POST /api/list` are extended to carry shop info. The frontend gets a tab row above the list — the active tab filters an already-fetched item list client-side, and adding a new item attaches it to whichever shop tab is active.

**Tech Stack:** Same as the v1 app — TypeScript, Express + Prisma + Postgres backend, React + Vite + TanStack Query frontend. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-13-shop-categorized-lists-design.md`

## Global Constraints

- Every active list item belongs to exactly one shop (`shopId` is required,
  not nullable).
- The product catalog (`Product` table, quick-add search, purchase
  history/frequency) stays shop-agnostic — no changes to `Product`.
- Shop creation broadcasts via the existing `broadcastListChanged()`
  mechanism — no new SSE event type.
- `GET /api/list` fetches the full list once; shop filtering happens
  client-side. No shop-scoped list endpoint.
- Adding a new shop from the tab row does not require a shop picker
  inside the Add Item sheet — new items are always created against
  whichever shop tab is currently active.
- All UI text in Hebrew, RTL layout, mobile-first (unchanged from v1).
- TypeScript strict mode on both frontend and backend (unchanged from v1).

---

## Task 1: Shop schema + wire shopId into the list endpoints

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/tests/setup.ts`
- Modify: `backend/src/routes/list.ts`
- Modify: `backend/tests/list.get.test.ts`
- Modify: `backend/tests/list.post.test.ts`
- Modify: `backend/tests/list.patch.test.ts`
- Modify: `backend/tests/list.complete.test.ts`
- Modify: `backend/tests/list.delete.test.ts`
- Modify: `backend/tests/errorHandling.test.ts`
- Modify: `backend/tests/sse.test.ts`

**Interfaces:**
- Produces: `Shop` Prisma model (`id`, `name`, `createdAt`). `ShoppingListItem.shopId` (required, FK → `Shop`). `GET /api/list` response items gain a `shop: { id, name }` sub-object. `POST /api/list` requires `shopId` in the body — `400` if missing, `404` if it doesn't resolve to an existing shop.
- Consumes: `prisma`, `broadcastListChanged`, `asyncHandler` (all pre-existing).

This task touches every existing test that creates a `ShoppingListItem`,
because the new `shopId` column is required — none of them will pass
until both the schema and the route handlers agree on it. That's why the
file list is long: it's one coherent change, not several.

**Migration safety note:** the spec calls for a careful nullable-then-
backfill-then-required sequence when applying this schema change to the
real production database, in case it already has rows. Verified directly
before writing this plan (`prisma.shoppingListItem.count()` against the
real Neon database): **0 rows**. A direct schema push (no backfill dance)
is therefore safe today, and this plan does not include backfill
machinery. If this plan is executed after the production table has
gained rows in the meantime, re-check the row count first
(`prisma.shoppingListItem.count()`) — if it's nonzero, add an
intermediate step: push `shopId` as nullable first, backfill every
existing row to the first default shop's id, then push again with
`shopId` required.

- [ ] **Step 1: Update the Prisma schema**

```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id          String    @id @default(cuid())
  name        String
  category    String?
  photoUrl    String?
  timesAdded  Int       @default(0)
  lastAddedAt DateTime?
  createdAt   DateTime  @default(now())

  listItems ShoppingListItem[]
}

model Shop {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())

  listItems ShoppingListItem[]
}

model ShoppingListItem {
  id        String   @id @default(cuid())
  productId String
  shopId    String
  quantity  String?
  note      String?
  createdAt DateTime @default(now())

  product Product @relation(fields: [productId], references: [id])
  shop    Shop    @relation(fields: [shopId], references: [id])
}
```

- [ ] **Step 2: Update the test cleanup hook to also truncate Shop**

```typescript
// backend/tests/setup.ts
import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/db.js";

beforeEach(async () => {
  await prisma.shoppingListItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.shop.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

(`shoppingListItem` must be deleted first since it has foreign keys into
both `product` and `shop`.)

- [ ] **Step 3: Update every existing test that creates a ShoppingListItem, to satisfy the new required shopId**

```typescript
// backend/tests/list.get.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("GET /api/list", () => {
  it("returns an empty list when nothing has been added", async () => {
    const app = createApp();
    const res = await request(app).get("/api/list");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns items with their product and shop info", async () => {
    const product = await prisma.product.create({
      data: { name: "חלב", category: "מוצרי חלב" },
    });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id, quantity: "2" },
    });

    const app = createApp();
    const res = await request(app).get("/api/list");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].quantity).toBe("2");
    expect(res.body[0].product.name).toBe("חלב");
    expect(res.body[0].shop.name).toBe("סופרמרקט");
  });
});
```

```typescript
// backend/tests/list.post.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("POST /api/list", () => {
  it("creates a new product and list item when given a name", async () => {
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();
    const res = await request(app)
      .post("/api/list")
      .send({ name: "חלב", category: "מוצרי חלב", quantity: "2", shopId: shop.id });

    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe("2");
    expect(res.body.product.name).toBe("חלב");
    expect(res.body.shop.id).toBe(shop.id);

    const products = await prisma.product.findMany();
    expect(products).toHaveLength(1);
  });

  it("reuses an existing product when given a productId", async () => {
    const product = await prisma.product.create({ data: { name: "ביצים" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();

    const res = await request(app)
      .post("/api/list")
      .send({ productId: product.id, quantity: "12", shopId: shop.id });

    expect(res.status).toBe(201);
    expect(res.body.product.id).toBe(product.id);

    const products = await prisma.product.findMany();
    expect(products).toHaveLength(1);
  });

  it("returns 400 when neither productId nor name is given", async () => {
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();
    const res = await request(app).post("/api/list").send({ quantity: "1", shopId: shop.id });
    expect(res.status).toBe(400);
  });

  it("returns 404 when productId does not exist", async () => {
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();
    const res = await request(app)
      .post("/api/list")
      .send({ productId: "does-not-exist", shopId: shop.id });
    expect(res.status).toBe(404);
  });

  it("returns 400 when shopId is missing", async () => {
    const app = createApp();
    const res = await request(app).post("/api/list").send({ name: "לחם" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when shopId does not exist", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/list")
      .send({ name: "לחם", shopId: "does-not-exist" });
    expect(res.status).toBe(404);
  });
});
```

```typescript
// backend/tests/list.patch.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("PATCH /api/list/:id", () => {
  it("updates quantity and note", async () => {
    const product = await prisma.product.create({ data: { name: "לחם" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id, quantity: "1" },
    });

    const app = createApp();
    const res = await request(app)
      .patch(`/api/list/${item.id}`)
      .send({ quantity: "2", note: "כוסמין" });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe("2");
    expect(res.body.note).toBe("כוסמין");
  });

  it("returns 404 for a missing item", async () => {
    const app = createApp();
    const res = await request(app)
      .patch("/api/list/does-not-exist")
      .send({ quantity: "2" });
    expect(res.status).toBe(404);
  });
});
```

```typescript
// backend/tests/list.complete.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("POST /api/list/:id/complete", () => {
  it("removes the item and updates product history stats", async () => {
    const product = await prisma.product.create({ data: { name: "עגבניות" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id, quantity: "1" },
    });

    const app = createApp();
    const res = await request(app).post(`/api/list/${item.id}/complete`);
    expect(res.status).toBe(204);

    const remaining = await prisma.shoppingListItem.findUnique({ where: { id: item.id } });
    expect(remaining).toBeNull();

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.timesAdded).toBe(1);
    expect(updatedProduct?.lastAddedAt).not.toBeNull();
  });

  it("returns 404 for a missing item", async () => {
    const app = createApp();
    const res = await request(app).post("/api/list/does-not-exist/complete");
    expect(res.status).toBe(404);
  });
});
```

```typescript
// backend/tests/list.delete.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("DELETE /api/list/:id", () => {
  it("removes the item without touching product history stats", async () => {
    const product = await prisma.product.create({ data: { name: "מלפפון" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id },
    });

    const app = createApp();
    const res = await request(app).delete(`/api/list/${item.id}`);
    expect(res.status).toBe(204);

    const remaining = await prisma.shoppingListItem.findUnique({ where: { id: item.id } });
    expect(remaining).toBeNull();

    const untouchedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(untouchedProduct?.timesAdded).toBe(0);
    expect(untouchedProduct?.lastAddedAt).toBeNull();
  });

  it("returns 404 for a missing item", async () => {
    const app = createApp();
    const res = await request(app).delete("/api/list/does-not-exist");
    expect(res.status).toBe(404);
  });
});
```

```typescript
// backend/tests/errorHandling.test.ts
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("async route error handling", () => {
  it("returns a clean 500 instead of crashing when a Prisma call rejects", async () => {
    const product = await prisma.product.create({ data: { name: "עגבניות" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id, quantity: "1" },
    });

    const originalDelete = prisma.shoppingListItem.delete;
    prisma.shoppingListItem.delete = vi
      .fn()
      .mockRejectedValueOnce(new Error("simulated race")) as typeof originalDelete;

    try {
      const app = createApp();
      const res = await request(app).delete(`/api/list/${item.id}`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "internal error" });
    } finally {
      prisma.shoppingListItem.delete = originalDelete;
    }
  });

  it("keeps serving requests normally after a handler error (process is still alive)", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("still works for a normal delete flow after a previous request errored", async () => {
    const product = await prisma.product.create({ data: { name: "מלפפון" } });
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, shopId: shop.id, quantity: "2" },
    });

    const app = createApp();
    const res = await request(app).delete(`/api/list/${item.id}`);

    expect(res.status).toBe(204);

    const remaining = await prisma.shoppingListItem.findUnique({ where: { id: item.id } });
    expect(remaining).toBeNull();
  });
});
```

```typescript
// backend/tests/sse.test.ts
import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../src/sse.js", async () => {
  const actual = await vi.importActual<typeof import("../src/sse.js")>("../src/sse.js");
  return {
    ...actual,
    broadcastListChanged: vi.fn(),
  };
});

import { createApp } from "../src/app.js";
import { broadcastListChanged } from "../src/sse.js";
import { prisma } from "../src/db.js";

describe("SSE broadcast wiring", () => {
  it("broadcasts list-changed after adding an item", async () => {
    const shop = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const app = createApp();
    await request(app).post("/api/list").send({ name: "תה", shopId: shop.id });

    expect(broadcastListChanged).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the full suite, confirm it fails (RED)**

Run: `npm run test -w backend`
Expected: FAIL — `list.get.test.ts`'s shop assertion, `list.post.test.ts`'s
201/404 assertions, and `sse.test.ts`'s broadcast assertion should all
fail, because `list.ts` doesn't read or validate `shopId` yet (the
`prisma.shoppingListItem.create` call still omits it, which now violates
the required-column constraint).

- [ ] **Step 5: Update the list router to require and return shopId**

```typescript
// backend/src/routes/list.ts
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
  res.json(items);
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
```

(Only `GET /` and `POST /` changed — `PATCH`, `complete`, and `DELETE`
are copied through unchanged, per the spec's "Unchanged" list.)

- [ ] **Step 6: Run the full suite, confirm it passes (GREEN)**

Run: `npm run test -w backend`
Expected: PASS — all files, including the ones just modified.

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma backend/tests/setup.ts backend/src/routes/list.ts \
  backend/tests/list.get.test.ts backend/tests/list.post.test.ts backend/tests/list.patch.test.ts \
  backend/tests/list.complete.test.ts backend/tests/list.delete.test.ts \
  backend/tests/errorHandling.test.ts backend/tests/sse.test.ts
git commit -m "feat: add Shop model and require shopId on list items"
```

---

## Task 2: Shops endpoints

**Files:**
- Create: `backend/src/routes/shops.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/shops.test.ts`

**Interfaces:**
- Consumes: `prisma`, `broadcastListChanged`, `asyncHandler` (all
  pre-existing), the `Shop` model from Task 1.
- Produces: `shopsRouter` (Express `Router`) exported from
  `backend/src/routes/shops.ts`, mounted at `/api/shops`.
  `GET /api/shops` returns all shops ordered by `createdAt` ascending.
  `POST /api/shops` creates a shop from `{ name }` (trimmed, required —
  `400` if missing/blank), returns `201` with the created shop, and
  broadcasts `list-changed`.

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/tests/shops.test.ts
import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../src/sse.js", async () => {
  const actual = await vi.importActual<typeof import("../src/sse.js")>("../src/sse.js");
  return {
    ...actual,
    broadcastListChanged: vi.fn(),
  };
});

import { createApp } from "../src/app.js";
import { broadcastListChanged } from "../src/sse.js";
import { prisma } from "../src/db.js";

describe("GET /api/shops", () => {
  it("returns shops ordered by creation time", async () => {
    const first = await prisma.shop.create({ data: { name: "סופרמרקט" } });
    const second = await prisma.shop.create({ data: { name: "גוד פארם" } });

    const app = createApp();
    const res = await request(app).get("/api/shops");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe(first.id);
    expect(res.body[1].id).toBe(second.id);
  });
});

describe("POST /api/shops", () => {
  it("creates a new shop and broadcasts the change", async () => {
    const app = createApp();
    const res = await request(app).post("/api/shops").send({ name: "סופר-פארם" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("סופר-פארם");
    expect(broadcastListChanged).toHaveBeenCalled();

    const shops = await prisma.shop.findMany();
    expect(shops).toHaveLength(1);
  });

  it("returns 400 when name is missing", async () => {
    const app = createApp();
    const res = await request(app).post("/api/shops").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is blank", async () => {
    const app = createApp();
    const res = await request(app).post("/api/shops").send({ name: "   " });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — `GET`/`POST /api/shops` return 404 (route not mounted)

- [ ] **Step 3: Implement the shops router**

```typescript
// backend/src/routes/shops.ts
import { Router } from "express";
import { prisma } from "../db.js";
import { broadcastListChanged } from "../sse.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const shopsRouter = Router();

shopsRouter.get("/", asyncHandler(async (_req, res) => {
  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: "asc" },
  });
  res.json(shops);
}));

shopsRouter.post("/", asyncHandler(async (req, res) => {
  const { name } = req.body ?? {};

  if (!name || !String(name).trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const shop = await prisma.shop.create({
    data: { name: String(name).trim() },
  });

  broadcastListChanged();
  res.status(201).json(shop);
}));
```

- [ ] **Step 4: Mount the router**

Modify `backend/src/app.ts`:

```typescript
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

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "internal error" });
    }
  });

  return app;
}
```

- [ ] **Step 5: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/shops.ts backend/src/app.ts backend/tests/shops.test.ts
git commit -m "feat: add GET/POST /api/shops endpoints"
```

---

## Task 3: Frontend — shop tabs and wiring

**Files:**
- Create: `frontend/src/api/shops.ts`
- Create: `frontend/src/components/ShopTabs.tsx`
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/list.ts`
- Modify: `frontend/src/api/useListEvents.ts`
- Modify: `frontend/src/components/AddItemSheet.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `API_BASE_URL` from `frontend/src/api/client.ts`;
  backend `GET`/`POST /api/shops` (Task 2), `GET`/`POST /api/list` with
  shop info (Task 1).
- Produces: `Shop` type from `frontend/src/api/types.ts`;
  `SHOPS_QUERY_KEY`, `useShopsQuery()`, `useAddShop()` from
  `frontend/src/api/shops.ts`; `ShopTabs` component.

- [ ] **Step 1: Add the Shop type and extend ShoppingListItem**

```typescript
// frontend/src/api/types.ts
export interface Product {
  id: string;
  name: string;
  category: string | null;
  photoUrl: string | null;
  timesAdded: number;
  lastAddedAt: string | null;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  createdAt: string;
}

export interface ShoppingListItem {
  id: string;
  quantity: string | null;
  note: string | null;
  createdAt: string;
  product: Pick<Product, "id" | "name" | "category" | "photoUrl">;
  shop: Pick<Shop, "id" | "name">;
}
```

- [ ] **Step 2: Add shopId to AddItemInput**

Modify `frontend/src/api/list.ts` — change the `AddItemInput` interface
only (the rest of the file is unchanged):

```typescript
export interface AddItemInput {
  productId?: string;
  name?: string;
  category?: string;
  quantity?: string;
  note?: string;
  shopId: string;
}
```

- [ ] **Step 3: Create the shops API hooks**

```typescript
// frontend/src/api/shops.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Shop } from "./types";

export const SHOPS_QUERY_KEY = ["shops"] as const;

export function useShopsQuery() {
  return useQuery({
    queryKey: SHOPS_QUERY_KEY,
    queryFn: () => apiFetch<Shop[]>("/api/shops"),
  });
}

export function useAddShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<Shop>("/api/shops", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPS_QUERY_KEY });
    },
  });
}
```

- [ ] **Step 4: Create the ShopTabs component**

```tsx
// frontend/src/components/ShopTabs.tsx
import { useState } from "react";
import { useShopsQuery, useAddShop } from "../api/shops";

interface ShopTabsProps {
  activeShopId: string | null;
  onSelect: (shopId: string) => void;
}

export function ShopTabs({ activeShopId, onSelect }: ShopTabsProps) {
  const { data: shops } = useShopsQuery();
  const addShop = useAddShop();
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [newShopName, setNewShopName] = useState("");

  const handleCreateShop = () => {
    const name = newShopName.trim();
    if (!name) return;
    addShop.mutate(name, {
      onSuccess: (shop) => {
        onSelect(shop.id);
        setNewShopName("");
        setIsAddingShop(false);
      },
    });
  };

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {shops?.map((shop) => (
        <button
          key={shop.id}
          type="button"
          onClick={() => onSelect(shop.id)}
          className={
            shop.id === activeShopId
              ? "shrink-0 rounded-full bg-blue-600 px-3 py-1 text-sm text-white"
              : "shrink-0 rounded-full border border-slate-300 px-3 py-1 text-sm"
          }
        >
          {shop.name}
        </button>
      ))}

      {isAddingShop ? (
        <div className="flex shrink-0 items-center gap-1">
          <input
            autoFocus
            value={newShopName}
            onChange={(e) => setNewShopName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateShop()}
            placeholder="שם החנות"
            className="w-24 rounded-full border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleCreateShop}
            disabled={!newShopName.trim() || addShop.isPending}
            className="rounded-full bg-blue-600 px-2 py-1 text-sm text-white disabled:opacity-50"
          >
            הוסף
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingShop(true)}
          className="shrink-0 rounded-full border border-dashed border-slate-400 px-3 py-1 text-sm text-slate-500"
        >
          +
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Extend the SSE hook to also refresh shops**

Modify `frontend/src/api/useListEvents.ts`:

```typescript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./client";
import { LIST_QUERY_KEY } from "./list";
import { SHOPS_QUERY_KEY } from "./shops";

export function useListEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}/api/events`);

    source.addEventListener("list-changed", () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SHOPS_QUERY_KEY });
    });

    return () => {
      source.close();
    };
  }, [queryClient]);
}
```

- [ ] **Step 6: Pass the active shop into AddItemSheet**

Modify `frontend/src/components/AddItemSheet.tsx` — add a `shopId` prop
and include it in both `addItem.mutate` calls (everything else in the
file, including the JSX, is unchanged):

```tsx
interface AddItemSheetProps {
  shopId: string;
  onClose: () => void;
}

export function AddItemSheet({ shopId, onClose }: AddItemSheetProps) {
  // ...unchanged state declarations...

  const handleAddExisting = (productId: string) => {
    addItem.mutate(
      { productId, quantity: quantity || undefined, shopId },
      {
        onSuccess: () => {
          attachPhotoIfAny(productId);
          onClose();
        },
      }
    );
  };

  const handleCreateNew = () => {
    if (!search.trim()) return;
    addItem.mutate(
      { name: search.trim(), quantity: quantity || undefined, shopId },
      {
        onSuccess: (item) => {
          attachPhotoIfAny(item.product.id);
          onClose();
        },
      }
    );
  };

  // ...unchanged JSX...
}
```

- [ ] **Step 7: Wire ShopTabs and active-shop filtering into App**

```tsx
// frontend/src/App.tsx
import { useEffect, useState } from "react";
import { useListQuery, useCompleteItem, useDeleteItem } from "./api/list";
import { useShopsQuery } from "./api/shops";
import { useListEvents } from "./api/useListEvents";
import { ItemCard } from "./components/ItemCard";
import { AddItemSheet } from "./components/AddItemSheet";
import { ShopTabs } from "./components/ShopTabs";
import { ProfileSwitcher, useProfile } from "./components/ProfileSwitcher";

export default function App() {
  useListEvents();
  const [profile, setProfile] = useProfile();
  const { data: items, isLoading, isError, refetch } = useListQuery();
  const { data: shops } = useShopsQuery();
  const completeItem = useCompleteItem();
  const deleteItem = useDeleteItem();
  const [isAdding, setIsAdding] = useState(false);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeShopId && shops && shops.length > 0) {
      setActiveShopId(shops[0].id);
    }
  }, [shops, activeShopId]);

  const visibleItems = items?.filter((item) => item.shop.id === activeShopId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">היי, {profile}</h1>
        <ProfileSwitcher profile={profile} onChange={setProfile} />
      </div>

      <ShopTabs activeShopId={activeShopId} onSelect={setActiveShopId} />

      {isLoading && <p>טוען...</p>}

      {isError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
          <p>שגיאה בטעינת הרשימה. אירעה שגיאה, נסה שוב.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 rounded-md bg-red-600 px-3 py-1 text-sm text-white"
          >
            נסה שוב
          </button>
        </div>
      )}

      {!isError && (
        <ul className="flex flex-col gap-2">
          {visibleItems?.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onComplete={(id) => completeItem.mutate(id)}
              onDelete={(id) => deleteItem.mutate(id)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        disabled={!activeShopId}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-blue-600 text-2xl text-white shadow-lg disabled:opacity-50"
      >
        +
      </button>

      {isAdding && activeShopId && (
        <AddItemSheet shopId={activeShopId} onClose={() => setIsAdding(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Verify**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — must be
clean under strict mode.

Then do a live functional check: seed a couple of shops and items via
curl against a running backend (pick free ports with `lsof` first, and
kill only your own dev-server PIDs afterward, not a broad `pkill`):

```bash
curl -X POST http://localhost:<port>/api/shops -H "Content-Type: application/json" -d '{"name":"בדיקה"}'
```

Confirm the new shop's `id` from the response, then create a list item
against it via `POST /api/list` with that `shopId`, and confirm
`GET /api/list` returns the item with the correct `shop.name`. Trace
through `App.tsx`/`ShopTabs.tsx` to confirm the frontend would render
this correctly (tab appears, item shows only when that tab is active).
Clean up any test shops/items you create.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/api/shops.ts frontend/src/components/ShopTabs.tsx \
  frontend/src/api/types.ts frontend/src/api/list.ts frontend/src/api/useListEvents.ts \
  frontend/src/components/AddItemSheet.tsx frontend/src/App.tsx
git commit -m "feat: add shop tabs and wire shop selection into item creation"
```

---

## Follow-up (not a task — controller/deployer action, not a subagent dispatch)

The three default shops (סופרמרקט, גוד פארם, סופר-פארם) need to be
seeded once into the real production database after Task 1 and Task 2
land — this touches live shared data, so it should be run directly
against production rather than delegated, the same way the initial
`prisma db push` was run directly in the v1 build. A one-line script or
three `POST /api/shops` calls against the deployed (or locally-run
against the production `DATABASE_URL`) backend are both sufficient;
there's no dedicated seed script in this plan since it's a one-time,
three-row operation.
