# Fooder — Shared Shopping List (v1 Design)

## Purpose

Dvir and Mai handle food-related decisions (what to buy, what's needed) 3x/day
today via memory and ad-hoc notes. This project replaces that with a shared,
always-in-sync shopping list app, usable from a phone while actually at the
store. This is the first sub-project of a broader "food" domain; later
sub-projects (pantry inventory, meal planning, etc.) are out of scope here and
will get their own design/spec cycle.

## Scope (v1)

In scope:
- Shared shopping list: add, edit, delete items
- Optional quantity, category (free text), and photo per item
- Checking an item off removes it from the active list and records it in a
  persistent product catalog/history, so it can be quickly re-added later
  without retyping or re-uploading a photo
- "Quick add" when creating a new list item: search/browse the catalog first,
  falling back to creating a brand-new product
- Hebrew-only UI, RTL layout, mobile-first (iPhone)
- Live sync: when one person changes the list, the other sees it update
  without a manual refresh
- No real authentication — a cosmetic Dvir/Mai profile switcher (local to the
  device, not sent to or tracked by the backend)

Explicitly deferred (backlog, future sub-projects):
- Pantry/inventory tracking (what's already at home)
- Meal planning tied to ingredients
- Push notifications
- Budget/cost tracking
- Voice input

## Architecture

- **Frontend**: React + Vite + TypeScript SPA, Tailwind CSS, mobile-first,
  RTL (`dir="rtl"`). TanStack Query for data fetching/caching.
- **Backend**: Node.js + Express + TypeScript, REST API. Prisma as the ORM.
- **Database**: PostgreSQL (Neon free tier, serverless Postgres).
- **Image storage**: Cloudflare R2 (S3-compatible, free tier, no egress
  fees). Backend receives the upload and streams it to R2; only the
  resulting URL is stored in Postgres.
- **Realtime sync**: Server-Sent Events (SSE). The backend keeps an
  in-memory list of connected SSE clients (single process — no Redis/pub-sub
  needed at this scale). After any mutation, it broadcasts a minimal
  "list-changed" event; clients respond by refetching `GET /api/list`. SSE
  was chosen over WebSockets because sync only needs to flow server→client
  (writes go through normal REST calls), and `EventSource` has built-in
  auto-reconnect, making it simpler than WebSockets while staying more
  responsive/efficient than polling.
- **Deployment** (all free tier): Vercel (static frontend build), Render
  free web service (backend — supports the long-lived SSE connections;
  spins down after 15 min idle, acceptable for this usage pattern), Neon
  (Postgres), Cloudflare R2 (images).

## Data Model

Two tables. No Users table — the Dvir/Mai switcher is frontend-only
(`localStorage`), with no backend concept of "current user."

```
Product
  id            (pk)
  name          text, required
  category      text, optional
  photoUrl      text, optional
  timesAdded    int, default 0
  lastAddedAt   timestamp, optional
  createdAt     timestamp

ShoppingListItem
  id            (pk)
  productId     fk -> Product
  quantity      text, optional   (e.g. "2", "1 ק"ג" — freeform, no unit modeling)
  note          text, optional
  createdAt     timestamp
```

`Product` is both the catalog and the history: rows are created once and
never deleted, accumulating `timesAdded`/`lastAddedAt` as items are bought
over time. `ShoppingListItem` represents only what's currently on the active
list — one row per product currently requested.

## API

REST endpoints (Express):

- `GET /api/list` — active list, items joined with product info
  (name/category/photoUrl)
- `POST /api/list` — add an item; body has either an existing `productId`,
  or a new `name` (creates the Product first), plus optional
  `quantity`/`note`
- `PATCH /api/list/:id` — edit `quantity`/`note`
- `POST /api/list/:id/complete` — mark bought: deletes the
  `ShoppingListItem`, bumps `timesAdded`/`lastAddedAt` on its `Product`
- `DELETE /api/list/:id` — remove without marking bought (e.g. added by
  mistake) — does not touch history stats
- `GET /api/products?q=` — catalog search for "quick add," sorted by most
  recently/frequently bought
- `POST /api/products/:id/photo` — multipart upload, streamed to R2, saves
  the resulting URL onto the Product
- `GET /api/events` — SSE stream; broadcasts a "list-changed" ping after any
  mutation above

## Frontend UX

- Single main screen: the active list, rendered as item cards (photo
  thumbnail or placeholder, name, quantity, category tag), each with a
  checkbox (mark bought) and a delete icon (remove without counting as
  bought).
- "Add Item" sheet/modal: search the catalog first (surfacing
  recent/frequent products), or type a new name to create a fresh product;
  optional quantity, category, and photo at creation time.
- Small Dvir/Mai toggle in a corner, persisted in `localStorage`, driving a
  cosmetic greeting only.
- An SSE listener invalidates the TanStack Query cache on "list-changed",
  triggering a refetch of `GET /api/list`.

## Testing

- Backend: Vitest for business logic (especially the complete-vs-delete
  history bookkeeping), plus integration tests against the key API
  endpoints.
- Frontend: no heavy automated test suite for v1 — this is a two-person
  household app; manual in-browser verification is sufficient. Revisit if
  the app grows.

## Error Handling Notes

- Photo upload failures should not block adding the list item — the item is
  created/updated without a photo, and the user can retry the photo upload
  separately.
- SSE disconnects rely on `EventSource`'s built-in reconnect; no custom
  reconnect logic needed.
- Free-tier backend cold starts (after 15 min idle) mean the first request
  after inactivity may take 30-60s — acceptable for this usage pattern, no
  special handling planned for v1.

## Amendment (2026-09-12, during Task 2 implementation)

The original plan called for Docker-based local Postgres for development,
separate from Neon in production. This was replaced, at the user's
explicit request, with: local dev and production sharing one remote Neon
Postgres database (no Docker, no separate local Postgres to manage), and
automated tests running against a fully separate, ephemeral local
Postgres instance (via the `embedded-postgres` npm package) that is
created and destroyed per test run — so running the test suite can never
delete real household data. Schema changes use `prisma db push`
throughout (no migration history) — a deliberate simplification for a
single-developer project. See the implementation plan's Task 2 and
Global Constraints for the concrete mechanics.
