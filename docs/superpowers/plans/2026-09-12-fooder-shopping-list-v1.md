# Fooder Shared Shopping List v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v1 of Fooder — a shared, live-synced shopping list web app for Dvir and Mai, with a Hebrew RTL mobile-first frontend and a REST+SSE backend.

**Architecture:** A two-workspace npm monorepo — a React+Vite+TypeScript SPA frontend and a Node/Express+TypeScript REST API backend — talking to a single PostgreSQL database via Prisma. Live sync flows one-way (server→client) over Server-Sent Events. Product photos are uploaded through the backend to Cloudflare R2.

**Tech Stack:** TypeScript everywhere; React 18 + Vite + Tailwind CSS v4 + TanStack Query (frontend); Express + Prisma (backend); PostgreSQL (Neon in production, Docker locally); Cloudflare R2 (S3-compatible object storage) for photos; Vitest + Supertest for backend tests.

**Spec:** `docs/superpowers/specs/2026-09-12-fooder-shopping-list-design.md`

## Global Constraints

- All UI text in Hebrew; layout is RTL (`dir="rtl"`).
- Mobile-first, optimized for an iPhone viewport.
- TypeScript strict mode on both frontend and backend.
- No authentication in v1 — the Dvir/Mai switcher is frontend-only
  (`localStorage`); there is no backend Users table and no per-user data.
- All hosting must fit free tiers: Vercel (frontend), Render free web
  service (backend), Neon (Postgres), Cloudflare R2 (images).
- Realtime sync is SSE only (no WebSockets), broadcast via a single
  in-memory client list in the one backend process (no Redis/pub-sub).
- Checking an item off (`POST /api/list/:id/complete`) increments the
  product's history stats; deleting an item (`DELETE /api/list/:id`) does
  not.

---

## Task 1: Monorepo scaffold + backend health check

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/index.ts`
- Test: `backend/tests/health.test.ts`

**Interfaces:**
- Produces: `createApp(): Express` exported from `backend/src/app.ts` — the
  Express app factory every later backend task mounts routes onto and every
  backend test imports (tests never start a real listening server).

- [ ] **Step 1: Create the root package.json**

```json
{
  "name": "fooder",
  "private": true,
  "workspaces": [
    "backend"
  ]
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
*.log
```

- [ ] **Step 3: Create backend/package.json**

```json
{
  "name": "fooder-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.6.2",
    "tsx": "^4.19.1",
    "vitest": "^2.1.1",
    "supertest": "^7.0.0",
    "@types/express": "^4.17.21",
    "@types/node": "^22.7.4",
    "@types/supertest": "^6.0.2",
    "@types/cors": "^2.8.17"
  }
}
```

- [ ] **Step 4: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create backend/vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 6: Install dependencies**

Run from the repo root: `npm install`

- [ ] **Step 7: Write the failing test**

```typescript
// backend/tests/health.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /api/health", () => {
  it("returns status ok", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 8: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — cannot find module `../src/app.js`

- [ ] **Step 9: Implement the app factory**

```typescript
// backend/src/app.ts
import express, { Express } from "express";
import cors from "cors";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
```

- [ ] **Step 10: Implement the server entrypoint**

```typescript
// backend/src/index.ts
import { createApp } from "./app.js";

const app = createApp();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.listen(port, () => {
  console.log(`Fooder backend listening on port ${port}`);
});
```

- [ ] **Step 11: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add package.json .gitignore backend
git commit -m "feat: scaffold backend with health check endpoint"
```

---

## Task 2: Local Postgres + Prisma schema

**Files:**
- Create: `docker-compose.yml`
- Modify: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/.env` (local only, gitignored)
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/db.ts`
- Create: `backend/tests/setup.ts`
- Modify: `backend/vitest.config.ts`
- Test: `backend/tests/db.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `prisma` (a `PrismaClient` singleton) exported from
  `backend/src/db.ts`, used by every route task from here on. `Product` and
  `ShoppingListItem` Prisma models with the fields listed in the spec's
  Data Model section.

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: fooder
      POSTGRES_USER: fooder
      POSTGRES_PASSWORD: fooder
    ports:
      - "5432:5432"
    volumes:
      - fooder-postgres-data:/var/lib/postgresql/data

volumes:
  fooder-postgres-data:
```

- [ ] **Step 2: Start Postgres**

Run: `docker compose up -d`
Verify: `docker compose ps` shows the `postgres` service as `running`/`healthy`.

- [ ] **Step 3: Add Prisma dependencies**

Modify `backend/package.json`:

```json
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "@prisma/client": "^5.20.0"
  },
  "devDependencies": {
    "typescript": "^5.6.2",
    "tsx": "^4.19.1",
    "vitest": "^2.1.1",
    "supertest": "^7.0.0",
    "prisma": "^5.20.0",
    "@types/express": "^4.17.21",
    "@types/node": "^22.7.4",
    "@types/supertest": "^6.0.2",
    "@types/cors": "^2.8.17"
  }
```

Run: `npm install`

- [ ] **Step 4: Create env files**

```
# backend/.env.example
DATABASE_URL="postgresql://fooder:fooder@localhost:5432/fooder"
PORT=3001
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

Copy it: `cp backend/.env.example backend/.env` (the real `backend/.env` is gitignored and needs no R2 values yet — those are only required starting Task 9).

- [ ] **Step 5: Create the Prisma schema**

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

model ShoppingListItem {
  id        String   @id @default(cuid())
  productId String
  quantity  String?
  note      String?
  createdAt DateTime @default(now())

  product Product @relation(fields: [productId], references: [id])
}
```

- [ ] **Step 6: Write the failing test**

```typescript
// backend/tests/db.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "../src/db.js";

describe("Prisma schema", () => {
  it("creates and reads a product", async () => {
    const product = await prisma.product.create({
      data: { name: "חלב" },
    });

    const found = await prisma.product.findUnique({ where: { id: product.id } });
    expect(found?.name).toBe("חלב");
    expect(found?.timesAdded).toBe(0);
  });
});
```

- [ ] **Step 7: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — cannot find module `../src/db.js`

- [ ] **Step 8: Create the Prisma client singleton**

```typescript
// backend/src/db.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 9: Run the migration and generate the client**

Run (from `backend/`): `npx prisma migrate dev --name init`
This creates `backend/prisma/migrations/`, applies the schema to the local
Postgres container, and generates the `@prisma/client` types.

- [ ] **Step 10: Create the test DB cleanup hook**

```typescript
// backend/tests/setup.ts
import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/db.js";

beforeEach(async () => {
  await prisma.shoppingListItem.deleteMany();
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

- [ ] **Step 11: Wire the setup file into Vitest**

```typescript
// backend/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

- [ ] **Step 12: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add docker-compose.yml backend/package.json backend/package-lock.json \
  backend/.env.example backend/prisma backend/src/db.ts backend/tests/setup.ts \
  backend/vitest.config.ts backend/tests/db.test.ts
git commit -m "feat: add Postgres + Prisma schema for Product and ShoppingListItem"
```

(`backend/.env` is gitignored and must not be committed.)

---

## Task 3: GET /api/list

**Files:**
- Create: `backend/src/routes/list.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/list.get.test.ts`

**Interfaces:**
- Consumes: `prisma` from `backend/src/db.ts`, `createApp` from
  `backend/src/app.ts`.
- Produces: `listRouter` (an Express `Router`) exported from
  `backend/src/routes/list.ts`, mounted at `/api/list`. Response shape for
  every list item, reused by every later list-route task:
  `{ id, quantity, note, createdAt, product: { id, name, category, photoUrl } }`.

- [ ] **Step 1: Write the failing test**

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

  it("returns items with their product info", async () => {
    const product = await prisma.product.create({
      data: { name: "חלב", category: "מוצרי חלב" },
    });
    await prisma.shoppingListItem.create({
      data: { productId: product.id, quantity: "2" },
    });

    const app = createApp();
    const res = await request(app).get("/api/list");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].quantity).toBe("2");
    expect(res.body[0].product.name).toBe("חלב");
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — `GET /api/list` returns 404 (route not mounted)

- [ ] **Step 3: Implement the list router**

```typescript
// backend/src/routes/list.ts
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
```

- [ ] **Step 4: Mount the router**

Modify `backend/src/app.ts`:

```typescript
import express, { Express } from "express";
import cors from "cors";
import { listRouter } from "./routes/list.js";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/list", listRouter);

  return app;
}
```

- [ ] **Step 5: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/list.ts backend/src/app.ts backend/tests/list.get.test.ts
git commit -m "feat: add GET /api/list endpoint"
```

---

## Task 4: POST /api/list

**Files:**
- Modify: `backend/src/routes/list.ts`
- Test: `backend/tests/list.post.test.ts`

**Interfaces:**
- Consumes: `listRouter`, `prisma`.
- Produces: `POST /api/list` accepting
  `{ productId?: string; name?: string; category?: string; quantity?: string; note?: string }`,
  returning `201` with the created item (same shape as `GET /api/list`
  items), `400` if neither `productId` nor `name` is given, `404` if
  `productId` doesn't exist.

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/list.post.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("POST /api/list", () => {
  it("creates a new product and list item when given a name", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/list")
      .send({ name: "חלב", category: "מוצרי חלב", quantity: "2" });

    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe("2");
    expect(res.body.product.name).toBe("חלב");

    const products = await prisma.product.findMany();
    expect(products).toHaveLength(1);
  });

  it("reuses an existing product when given a productId", async () => {
    const product = await prisma.product.create({ data: { name: "ביצים" } });
    const app = createApp();

    const res = await request(app)
      .post("/api/list")
      .send({ productId: product.id, quantity: "12" });

    expect(res.status).toBe(201);
    expect(res.body.product.id).toBe(product.id);

    const products = await prisma.product.findMany();
    expect(products).toHaveLength(1);
  });

  it("returns 400 when neither productId nor name is given", async () => {
    const app = createApp();
    const res = await request(app).post("/api/list").send({ quantity: "1" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when productId does not exist", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/list")
      .send({ productId: "does-not-exist" });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — `POST /api/list` returns 404 for every case (route not defined)

- [ ] **Step 3: Implement the handler**

Add to `backend/src/routes/list.ts` (below the existing `GET /` handler):

```typescript
listRouter.post("/", async (req, res) => {
  const { productId, name, category, quantity, note } = req.body ?? {};

  if (!productId && !name) {
    res.status(400).json({ error: "productId or name is required" });
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
    data: { productId: product.id, quantity, note },
    include: {
      product: { select: { id: true, name: true, category: true, photoUrl: true } },
    },
  });

  res.status(201).json(item);
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/list.ts backend/tests/list.post.test.ts
git commit -m "feat: add POST /api/list endpoint"
```

---

## Task 5: PATCH /api/list/:id

**Files:**
- Modify: `backend/src/routes/list.ts`
- Test: `backend/tests/list.patch.test.ts`

**Interfaces:**
- Produces: `PATCH /api/list/:id` accepting `{ quantity?: string; note?: string }`,
  returning `200` with the updated item, or `404` if the item doesn't exist.

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/list.patch.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("PATCH /api/list/:id", () => {
  it("updates quantity and note", async () => {
    const product = await prisma.product.create({ data: { name: "לחם" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, quantity: "1" },
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

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — 404 for the update case too (route not defined)

- [ ] **Step 3: Implement the handler**

Add to `backend/src/routes/list.ts`:

```typescript
listRouter.patch("/:id", async (req, res) => {
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

  res.json(item);
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/list.ts backend/tests/list.patch.test.ts
git commit -m "feat: add PATCH /api/list/:id endpoint"
```

---

## Task 6: POST /api/list/:id/complete

**Files:**
- Modify: `backend/src/routes/list.ts`
- Test: `backend/tests/list.complete.test.ts`

**Interfaces:**
- Produces: `POST /api/list/:id/complete` — deletes the `ShoppingListItem`
  and increments `Product.timesAdded` + sets `Product.lastAddedAt` in one
  transaction. Returns `204` on success, `404` if the item doesn't exist.

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/list.complete.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("POST /api/list/:id/complete", () => {
  it("removes the item and updates product history stats", async () => {
    const product = await prisma.product.create({ data: { name: "עגבניות" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id, quantity: "1" },
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

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — 404 for both cases (route not defined)

- [ ] **Step 3: Implement the handler**

Add to `backend/src/routes/list.ts`:

```typescript
listRouter.post("/:id/complete", async (req, res) => {
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

  res.status(204).send();
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/list.ts backend/tests/list.complete.test.ts
git commit -m "feat: add POST /api/list/:id/complete endpoint"
```

---

## Task 7: DELETE /api/list/:id

**Files:**
- Modify: `backend/src/routes/list.ts`
- Test: `backend/tests/list.delete.test.ts`

**Interfaces:**
- Produces: `DELETE /api/list/:id` — deletes the `ShoppingListItem` without
  touching `Product` history stats. Returns `204`, or `404` if missing.

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/list.delete.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("DELETE /api/list/:id", () => {
  it("removes the item without touching product history stats", async () => {
    const product = await prisma.product.create({ data: { name: "מלפפון" } });
    const item = await prisma.shoppingListItem.create({
      data: { productId: product.id },
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

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — 404 for both cases (route not defined; also `DELETE` on
`/:id` currently collides with nothing so it's a clean 404)

- [ ] **Step 3: Implement the handler**

Add to `backend/src/routes/list.ts`:

```typescript
listRouter.delete("/:id", async (req, res) => {
  const item = await prisma.shoppingListItem.findUnique({
    where: { id: req.params.id },
  });
  if (!item) {
    res.status(404).json({ error: "item not found" });
    return;
  }

  await prisma.shoppingListItem.delete({ where: { id: item.id } });
  res.status(204).send();
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/list.ts backend/tests/list.delete.test.ts
git commit -m "feat: add DELETE /api/list/:id endpoint"
```

---

## Task 8: GET /api/products?q=

**Files:**
- Create: `backend/src/routes/products.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/products.get.test.ts`

**Interfaces:**
- Consumes: `prisma`.
- Produces: `productsRouter` exported from `backend/src/routes/products.ts`,
  mounted at `/api/products`. `GET /api/products?q=<text>` returns up to 20
  `Product` rows, filtered by case-insensitive substring match on `name`
  when `q` is given, ordered by `lastAddedAt` desc then `timesAdded` desc.

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/products.get.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

describe("GET /api/products", () => {
  it("filters by name, case-insensitively", async () => {
    await prisma.product.create({ data: { name: "חלב תנובה" } });
    await prisma.product.create({ data: { name: "קפה" } });

    const app = createApp();
    const res = await request(app).get("/api/products?q=חלב");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("חלב תנובה");
  });

  it("orders by most recently added first", async () => {
    const older = await prisma.product.create({
      data: { name: "א", lastAddedAt: new Date("2026-01-01") },
    });
    const newer = await prisma.product.create({
      data: { name: "ב", lastAddedAt: new Date("2026-02-01") },
    });

    const app = createApp();
    const res = await request(app).get("/api/products");

    expect(res.body[0].id).toBe(newer.id);
    expect(res.body[1].id).toBe(older.id);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — `GET /api/products` returns 404 (route not mounted)

- [ ] **Step 3: Implement the products router**

```typescript
// backend/src/routes/products.ts
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
```

- [ ] **Step 4: Mount the router**

Modify `backend/src/app.ts`:

```typescript
import express, { Express } from "express";
import cors from "cors";
import { listRouter } from "./routes/list.js";
import { productsRouter } from "./routes/products.js";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/list", listRouter);
  app.use("/api/products", productsRouter);

  return app;
}
```

- [ ] **Step 5: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/products.ts backend/src/app.ts backend/tests/products.get.test.ts
git commit -m "feat: add GET /api/products search endpoint"
```

---

## Task 9: Cloudflare R2 upload + POST /api/products/:id/photo

**Files:**
- Create: `backend/src/lib/r2.ts`
- Modify: `backend/package.json`
- Modify: `backend/src/routes/products.ts`
- Test: `backend/tests/products.photo.test.ts`

**Interfaces:**
- Produces: `uploadPhoto(key: string, body: Buffer, contentType: string): Promise<string>`
  exported from `backend/src/lib/r2.ts`, returning the public URL. Mocked
  in tests (and mockable by Task 10's SSE wiring) via `vi.mock("../src/lib/r2.js")`.
  `POST /api/products/:id/photo` accepts a single multipart field named
  `photo`, returns `200` with the updated `Product` (including `photoUrl`),
  `400` if no file is attached, `404` if the product doesn't exist.

- [ ] **Step 1: Add multer and the S3 SDK**

Modify `backend/package.json`:

```json
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "@prisma/client": "^5.20.0",
    "multer": "^1.4.5-lts.1",
    "@aws-sdk/client-s3": "^3.658.1"
  },
  "devDependencies": {
    "typescript": "^5.6.2",
    "tsx": "^4.19.1",
    "vitest": "^2.1.1",
    "supertest": "^7.0.0",
    "prisma": "^5.20.0",
    "@types/express": "^4.17.21",
    "@types/node": "^22.7.4",
    "@types/supertest": "^6.0.2",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.12"
  }
```

Run: `npm install`

- [ ] **Step 2: Write the failing test**

```typescript
// backend/tests/products.photo.test.ts
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

vi.mock("../src/lib/r2.js", () => ({
  uploadPhoto: vi.fn(async (key: string) => `https://fake-cdn.example/${key}`),
}));

describe("POST /api/products/:id/photo", () => {
  it("uploads a photo and stores the URL", async () => {
    const product = await prisma.product.create({ data: { name: "חלב" } });
    const app = createApp();

    const res = await request(app)
      .post(`/api/products/${product.id}/photo`)
      .attach("photo", Buffer.from("fake-image-bytes"), "milk.jpg");

    expect(res.status).toBe(200);
    expect(res.body.photoUrl).toMatch(/^https:\/\/fake-cdn\.example\//);
  });

  it("returns 400 when no file is attached", async () => {
    const product = await prisma.product.create({ data: { name: "קפה" } });
    const app = createApp();

    const res = await request(app).post(`/api/products/${product.id}/photo`);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a missing product", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/products/does-not-exist/photo")
      .attach("photo", Buffer.from("fake-image-bytes"), "milk.jpg");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 3: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — `backend/src/lib/r2.js` doesn't exist, so `vi.mock` has
nothing to mock and the route returns 404 (not mounted)

- [ ] **Step 4: Implement the R2 client wrapper**

```typescript
// backend/src/lib/r2.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET;
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

const r2Client = new S3Client({
  region: "auto",
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export async function uploadPhoto(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
  return `${publicBaseUrl}/${key}`;
}
```

- [ ] **Step 5: Implement the upload route**

Add to `backend/src/routes/products.ts`:

```typescript
import multer from "multer";
import { randomUUID } from "node:crypto";
import { uploadPhoto } from "../lib/r2.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

  res.json(updated);
});
```

- [ ] **Step 6: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/lib/r2.ts \
  backend/src/routes/products.ts backend/tests/products.photo.test.ts
git commit -m "feat: add photo upload to Cloudflare R2"
```

---

## Task 10: SSE endpoint + broadcast wiring

**Files:**
- Create: `backend/src/sse.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/routes/list.ts`
- Modify: `backend/src/routes/products.ts`
- Test: `backend/tests/sse.test.ts`

**Interfaces:**
- Produces: `eventsRouter` (mounted at `/api/events`) and
  `broadcastListChanged(): void`, both exported from `backend/src/sse.ts`.
  Every mutating list/product-photo handler calls `broadcastListChanged()`
  after its write succeeds. The frontend's SSE hook (Task 14) listens for
  the `list-changed` event name.

- [ ] **Step 1: Write the failing test**

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

describe("SSE broadcast wiring", () => {
  it("broadcasts list-changed after adding an item", async () => {
    const app = createApp();
    await request(app).post("/api/list").send({ name: "תה" });

    expect(broadcastListChanged).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm run test -w backend`
Expected: FAIL — `backend/src/sse.js` doesn't exist

- [ ] **Step 3: Implement the SSE module**

```typescript
// backend/src/sse.ts
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
```

- [ ] **Step 4: Mount the events router**

Modify `backend/src/app.ts`:

```typescript
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
```

- [ ] **Step 5: Wire broadcasts into the list routes**

Replace the contents of `backend/src/routes/list.ts` with:

```typescript
import { Router } from "express";
import { prisma } from "../db.js";
import { broadcastListChanged } from "../sse.js";

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

listRouter.post("/", async (req, res) => {
  const { productId, name, category, quantity, note } = req.body ?? {};

  if (!productId && !name) {
    res.status(400).json({ error: "productId or name is required" });
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
    data: { productId: product.id, quantity, note },
    include: {
      product: { select: { id: true, name: true, category: true, photoUrl: true } },
    },
  });

  broadcastListChanged();
  res.status(201).json(item);
});

listRouter.patch("/:id", async (req, res) => {
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
});

listRouter.post("/:id/complete", async (req, res) => {
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
});

listRouter.delete("/:id", async (req, res) => {
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
});
```

- [ ] **Step 6: Wire a broadcast into the photo upload route**

Modify `backend/src/routes/products.ts` — add the import and one call at
the end of the existing `photo` handler:

```typescript
import { broadcastListChanged } from "../sse.js";
```

```typescript
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { photoUrl },
  });

  broadcastListChanged();
  res.json(updated);
});
```

- [ ] **Step 7: Run the test, confirm it passes**

Run: `npm run test -w backend`
Expected: PASS

- [ ] **Step 8: Manually verify the raw SSE stream**

Run: `npm run dev -w backend`
In one terminal: `curl -N http://localhost:3001/api/events`
In another terminal: `curl -X POST http://localhost:3001/api/list -H "Content-Type: application/json" -d '{"name":"test"}'`
Expected: the `curl -N` terminal prints `event: list-changed` followed by `data: {}`.

- [ ] **Step 9: Commit**

```bash
git add backend/src/sse.ts backend/src/app.ts backend/src/routes/list.ts \
  backend/src/routes/products.ts backend/tests/sse.test.ts
git commit -m "feat: add SSE endpoint and broadcast list changes on mutation"
```

---

## Task 11: Frontend scaffold (Vite + Tailwind + RTL)

**Files:**
- Create: `frontend/` (via Vite scaffold command)
- Modify: `package.json` (root)
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/index.css`
- Modify: `frontend/index.html`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: a running Vite dev server proxying `/api` to `http://localhost:3001`,
  Tailwind CSS available via `@import "tailwindcss"`, and the page rendered
  RTL in Hebrew — the foundation every later frontend task builds on.

- [ ] **Step 1: Scaffold the Vite project**

Run from the repo root: `npm create vite@latest frontend -- --template react-ts`

- [ ] **Step 2: Add frontend to the workspaces**

Modify root `package.json`:

```json
{
  "name": "fooder",
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ]
}
```

- [ ] **Step 3: Install dependencies**

Run from the repo root: `npm install`
Then install the new packages: `npm install @tanstack/react-query -w frontend`
and `npm install tailwindcss @tailwindcss/vite -w frontend`

- [ ] **Step 4: Wire up Tailwind and the dev proxy**

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

```css
/* frontend/src/index.css — replace entire contents */
@import "tailwindcss";
```

- [ ] **Step 5: Set RTL and Hebrew on the page**

Modify `frontend/index.html` — change the `<html>` tag and `<title>`:

```html
<html lang="he" dir="rtl">
```

```html
<title>Fooder</title>
```

- [ ] **Step 6: Replace the placeholder App component**

```tsx
// frontend/src/App.tsx
export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <h1 className="text-2xl font-bold">רשימת קניות</h1>
    </div>
  );
}
```

- [ ] **Step 7: Manually verify**

Run: `npm run dev -w frontend`
Open `http://localhost:5173` and confirm: the page reads right-to-left,
the heading "רשימת קניות" is bold and dark, and the page background is a
light slate color (confirms Tailwind classes are actually applying, not
just present as unstyled text).

- [ ] **Step 8: Commit**

```bash
git add package.json frontend
git commit -m "feat: scaffold frontend with Vite, Tailwind, and RTL"
```

---

## Task 12: Active list screen

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/types.ts`
- Create: `frontend/src/api/list.ts`
- Create: `frontend/src/components/ItemCard.tsx`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: backend `GET /api/list`, `POST /api/list/:id/complete`,
  `DELETE /api/list/:id` from Tasks 3, 6, 7.
- Produces: `API_BASE_URL` and `apiFetch<T>(path, init?)` from
  `frontend/src/api/client.ts`; `LIST_QUERY_KEY`, `useListQuery()`,
  `useAddItem()`, `useCompleteItem()`, `useDeleteItem()` from
  `frontend/src/api/list.ts` — reused by Tasks 13 and 14. `ShoppingListItem`
  and `Product` types from `frontend/src/api/types.ts`, reused by Task 13.

- [ ] **Step 1: Create the API client**

```typescript
// frontend/src/api/client.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
```

- [ ] **Step 2: Create shared types**

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

export interface ShoppingListItem {
  id: string;
  quantity: string | null;
  note: string | null;
  createdAt: string;
  product: Pick<Product, "id" | "name" | "category" | "photoUrl">;
}
```

- [ ] **Step 3: Create the list query/mutation hooks**

```typescript
// frontend/src/api/list.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { ShoppingListItem } from "./types";

export const LIST_QUERY_KEY = ["list"] as const;

export function useListQuery() {
  return useQuery({
    queryKey: LIST_QUERY_KEY,
    queryFn: () => apiFetch<ShoppingListItem[]>("/api/list"),
  });
}

export interface AddItemInput {
  productId?: string;
  name?: string;
  category?: string;
  quantity?: string;
  note?: string;
}

export function useAddItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddItemInput) =>
      apiFetch<ShoppingListItem>("/api/list", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    },
  });
}

export function useCompleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/list/${id}/complete`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/list/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    },
  });
}
```

- [ ] **Step 4: Create the item card component**

```tsx
// frontend/src/components/ItemCard.tsx
import type { ShoppingListItem } from "../api/types";

interface ItemCardProps {
  item: ShoppingListItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ItemCard({ item, onComplete, onDelete }: ItemCardProps) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
      {item.product.photoUrl ? (
        <img
          src={item.product.photoUrl}
          alt={item.product.name}
          className="h-12 w-12 rounded-md object-cover"
        />
      ) : (
        <div className="h-12 w-12 rounded-md bg-slate-200" />
      )}

      <div className="flex-1">
        <p className="font-medium">{item.product.name}</p>
        <p className="text-sm text-slate-500">
          {[item.quantity, item.product.category].filter(Boolean).join(" · ")}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onComplete(item.id)}
        className="rounded-full border border-green-600 px-3 py-1 text-sm text-green-700"
      >
        נקנה
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="rounded-full border border-red-600 px-3 py-1 text-sm text-red-700"
      >
        מחק
      </button>
    </li>
  );
}
```

- [ ] **Step 5: Wire up the QueryClientProvider**

```tsx
// frontend/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] **Step 6: Render the list in App**

```tsx
// frontend/src/App.tsx
import { useListQuery, useCompleteItem, useDeleteItem } from "./api/list";
import { ItemCard } from "./components/ItemCard";

export default function App() {
  const { data: items, isLoading } = useListQuery();
  const completeItem = useCompleteItem();
  const deleteItem = useDeleteItem();

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <h1 className="mb-4 text-2xl font-bold">רשימת קניות</h1>

      {isLoading && <p>טוען...</p>}

      <ul className="flex flex-col gap-2">
        {items?.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onComplete={(id) => completeItem.mutate(id)}
            onDelete={(id) => deleteItem.mutate(id)}
          />
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 7: Manually verify**

Run: `npm run dev -w backend` and, in another terminal, `npm run dev -w frontend`

Seed an item: `curl -X POST http://localhost:3001/api/list -H "Content-Type: application/json" -d '{"name":"חלב","category":"מוצרי חלב","quantity":"2"}'`

Open `http://localhost:5173` and confirm the item "חלב" appears with its
quantity and category. Click "נקנה" and confirm it disappears. Seed
another item, click "מחק", and confirm it disappears; then run
`curl http://localhost:3001/api/products` and confirm the deleted
product's `timesAdded` is still `0` while the completed one's is `1`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/api frontend/src/components/ItemCard.tsx \
  frontend/src/main.tsx frontend/src/App.tsx
git commit -m "feat: render the active shopping list with complete/delete actions"
```

---

## Task 13: Add Item sheet

**Files:**
- Create: `frontend/src/api/products.ts`
- Create: `frontend/src/components/AddItemSheet.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `API_BASE_URL` from `frontend/src/api/client.ts`;
  `LIST_QUERY_KEY`, `useAddItem` from `frontend/src/api/list.ts`; `Product`
  from `frontend/src/api/types.ts`; backend `GET /api/products?q=` (Task 8)
  and `POST /api/products/:id/photo` (Task 9).
- Produces: `useProductsQuery(search: string)` and
  `useUploadProductPhoto()` from `frontend/src/api/products.ts`.

- [ ] **Step 1: Create the products search + photo upload hooks**

```typescript
// frontend/src/api/products.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, API_BASE_URL } from "./client";
import { LIST_QUERY_KEY } from "./list";
import type { Product } from "./types";

export function useProductsQuery(search: string) {
  return useQuery({
    queryKey: ["products", search] as const,
    queryFn: () => apiFetch<Product[]>(`/api/products?q=${encodeURIComponent(search)}`),
  });
}

export function useUploadProductPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`Photo upload failed with status ${res.status}`);
      }
      return (await res.json()) as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    },
  });
}
```

- [ ] **Step 2: Create the Add Item sheet**

```tsx
// frontend/src/components/AddItemSheet.tsx
import { useState } from "react";
import { useProductsQuery, useUploadProductPhoto } from "../api/products";
import { useAddItem } from "../api/list";

interface AddItemSheetProps {
  onClose: () => void;
}

export function AddItemSheet({ onClose }: AddItemSheetProps) {
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { data: products } = useProductsQuery(search);
  const addItem = useAddItem();
  const uploadPhoto = useUploadProductPhoto();

  const attachPhotoIfAny = (productId: string) => {
    if (file) {
      uploadPhoto.mutate({ productId, file });
    }
  };

  const handleAddExisting = (productId: string) => {
    addItem.mutate(
      { productId, quantity: quantity || undefined },
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
      { name: search.trim(), quantity: quantity || undefined },
      {
        onSuccess: (item) => {
          attachPhotoIfAny(item.product.id);
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 flex items-end bg-black/40">
      <div className="w-full rounded-t-xl bg-white p-4">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="מה צריך לקנות?"
          className="mb-2 w-full rounded-md border border-slate-300 p-2"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="כמות (לא חובה)"
          className="mb-2 w-full rounded-md border border-slate-300 p-2"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-3 w-full text-sm"
        />

        <ul className="mb-3 max-h-48 overflow-y-auto">
          {products?.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => handleAddExisting(product.id)}
                className="w-full rounded-md p-2 text-right hover:bg-slate-100"
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={!search.trim()}
            className="flex-1 rounded-md bg-blue-600 p-2 text-white disabled:opacity-50"
          >
            הוסף &quot;{search}&quot; כפריט חדש
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 p-2"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the sheet into App**

```tsx
// frontend/src/App.tsx
import { useState } from "react";
import { useListQuery, useCompleteItem, useDeleteItem } from "./api/list";
import { ItemCard } from "./components/ItemCard";
import { AddItemSheet } from "./components/AddItemSheet";

export default function App() {
  const { data: items, isLoading } = useListQuery();
  const completeItem = useCompleteItem();
  const deleteItem = useDeleteItem();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <h1 className="mb-4 text-2xl font-bold">רשימת קניות</h1>

      {isLoading && <p>טוען...</p>}

      <ul className="flex flex-col gap-2">
        {items?.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onComplete={(id) => completeItem.mutate(id)}
            onDelete={(id) => deleteItem.mutate(id)}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-blue-600 text-2xl text-white shadow-lg"
      >
        +
      </button>

      {isAdding && <AddItemSheet onClose={() => setIsAdding(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Manually verify**

With both dev servers running, click the "+" button, type a Hebrew name
not already in the catalog, attach a photo, and submit. Confirm the item
appears in the list with a thumbnail. Click "+" again, type a substring of
an existing product's name, confirm it appears as a suggestion, click it,
and confirm no duplicate product was created
(`curl http://localhost:3001/api/products?q=<name>` should show exactly one).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/products.ts frontend/src/components/AddItemSheet.tsx frontend/src/App.tsx
git commit -m "feat: add catalog search and create-new item sheet"
```

---

## Task 14: Live sync via SSE

**Files:**
- Create: `frontend/src/api/useListEvents.ts`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `API_BASE_URL` from `frontend/src/api/client.ts`,
  `LIST_QUERY_KEY` from `frontend/src/api/list.ts`, backend
  `GET /api/events` (Task 10).
- Produces: `useListEvents()` — call once from `App`; no return value.

- [ ] **Step 1: Create the SSE hook**

```typescript
// frontend/src/api/useListEvents.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./client";
import { LIST_QUERY_KEY } from "./list";

export function useListEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}/api/events`);

    source.addEventListener("list-changed", () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    });

    return () => {
      source.close();
    };
  }, [queryClient]);
}
```

- [ ] **Step 2: Call the hook from App**

Modify `frontend/src/App.tsx` — add the import and call it at the top of
the component body:

```typescript
import { useListEvents } from "./api/useListEvents";
```

```tsx
export default function App() {
  useListEvents();
  const { data: items, isLoading } = useListQuery();
  // ...unchanged below
```

- [ ] **Step 3: Manually verify**

With both dev servers running, open `http://localhost:5173` in two
separate browser tabs. Add an item from the Add Item sheet in tab A and
confirm it appears in tab B within a second or two without refreshing.
Complete or delete an item in tab B and confirm it disappears from tab A
the same way.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/useListEvents.ts frontend/src/App.tsx
git commit -m "feat: live-sync the list across clients via SSE"
```

---

## Task 15: Profile switcher

**Files:**
- Create: `frontend/src/components/ProfileSwitcher.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `useProfile(): [Profile, (profile: Profile) => void]` and the
  `<ProfileSwitcher>` component, both from
  `frontend/src/components/ProfileSwitcher.tsx`. `Profile` is the union
  `"דביר" | "מיי"`. Purely local (`localStorage`) — no backend involvement.

- [ ] **Step 1: Create the profile hook and switcher component**

```tsx
// frontend/src/components/ProfileSwitcher.tsx
import { useEffect, useState } from "react";

export type Profile = "דביר" | "מיי";

const STORAGE_KEY = "fooder.profile";

function readStoredProfile(): Profile {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "דביר" || stored === "מיי" ? stored : "דביר";
}

export function useProfile(): [Profile, (profile: Profile) => void] {
  const [profile, setProfile] = useState<Profile>(readStoredProfile);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, profile);
  }, [profile]);

  return [profile, setProfile];
}

interface ProfileSwitcherProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
}

export function ProfileSwitcher({ profile, onChange }: ProfileSwitcherProps) {
  return (
    <div className="flex gap-1 text-sm">
      {(["דביר", "מיי"] as const).map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={
            name === profile
              ? "rounded-full bg-blue-600 px-3 py-1 text-white"
              : "rounded-full border border-slate-300 px-3 py-1"
          }
        >
          {name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into App's header**

Modify `frontend/src/App.tsx` — add the import, the hook call, and a
header row above the heading:

```typescript
import { ProfileSwitcher, useProfile } from "./components/ProfileSwitcher";
```

```tsx
export default function App() {
  useListEvents();
  const [profile, setProfile] = useProfile();
  const { data: items, isLoading } = useListQuery();
  const completeItem = useCompleteItem();
  const deleteItem = useDeleteItem();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">היי, {profile}</h1>
        <ProfileSwitcher profile={profile} onChange={setProfile} />
      </div>
      {/* ...rest unchanged below */}
```

- [ ] **Step 3: Manually verify**

Open the app, switch between "דביר" and "מיי", confirm the greeting
updates immediately. Refresh the page and confirm the last-selected
profile persists.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProfileSwitcher.tsx frontend/src/App.tsx
git commit -m "feat: add cosmetic Dvir/Mai profile switcher"
```

---

## Task 16: Deployment configuration

**Files:**
- Create: `render.yaml`
- Create: `frontend/.env.example`
- Create: `README.md`

**Interfaces:** none — this task wires existing code to real free-tier
infrastructure and documents the process; it produces no code other
tasks depend on.

- [ ] **Step 1: Create the Render blueprint for the backend**

```yaml
# render.yaml
services:
  - type: web
    name: fooder-backend
    runtime: node
    rootDir: backend
    buildCommand: npm install && npm run build && npx prisma migrate deploy
    startCommand: npm run start
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: R2_ACCOUNT_ID
        sync: false
      - key: R2_ACCESS_KEY_ID
        sync: false
      - key: R2_SECRET_ACCESS_KEY
        sync: false
      - key: R2_BUCKET
        sync: false
      - key: R2_PUBLIC_BASE_URL
        sync: false
```

- [ ] **Step 2: Document the frontend's production API URL**

```
# frontend/.env.example
VITE_API_BASE_URL=https://your-backend.onrender.com
```

- [ ] **Step 3: Write the README**

```markdown
# Fooder

Shared shopping list for Dvir and Mai.

## Local development

1. `docker compose up -d` — starts local Postgres
2. `npm install` — installs both workspaces
3. `cp backend/.env.example backend/.env`
4. `cd backend && npx prisma migrate dev` (first time only)
5. `npm run dev -w backend` — backend on http://localhost:3001
6. `npm run dev -w frontend` — frontend on http://localhost:5173 (proxies `/api` to the backend)

## Deployment (all free tier)

1. **Database — Neon**: create a free Neon Postgres project, copy its
   connection string.
2. **Images — Cloudflare R2**: create a bucket, an API token
   (Object Read & Write), and enable public access (or a custom domain)
   for the bucket to get a public base URL.
3. **Backend — Render**: create a new Blueprint from this repo (uses
   `render.yaml`). Set the env vars: `DATABASE_URL` (from Neon),
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
   `R2_PUBLIC_BASE_URL` (from Cloudflare). Note the resulting
   `https://<service>.onrender.com` URL.
4. **Frontend — Vercel**: import this repo, set the project root directory
   to `frontend`, and set the env var `VITE_API_BASE_URL` to the Render
   backend URL from step 3.

## Verifying a production deploy

- Open the Vercel URL on a phone, add an item, and confirm it appears.
- Attach a photo to a new item and confirm it renders (proves the R2
  round-trip works).
- Open the app on two devices and confirm an add/complete/delete on one
  shows up on the other within a couple of seconds (proves SSE works
  across the Vercel/Render origin split).
- Note the first request after ~15 minutes of inactivity may take
  30-60 seconds while Render's free tier wakes the backend up — this is
  expected, not a bug.
```

- [ ] **Step 4: Set up the real accounts and deploy**

This step requires the repo owner's own accounts and credentials — it
can't be scripted by an engineer with no access to them. Follow the
README's "Deployment" section: create the Neon project, the Cloudflare R2
bucket and token, the Render Blueprint (with its env vars), and the
Vercel project (root directory `frontend`, `VITE_API_BASE_URL` set to the
Render URL). Then run through the README's "Verifying a production
deploy" checklist.

- [ ] **Step 5: Commit**

```bash
git add render.yaml frontend/.env.example README.md
git commit -m "docs: add deployment configuration and instructions"
```
