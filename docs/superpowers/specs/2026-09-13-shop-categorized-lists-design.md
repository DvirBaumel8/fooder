# Fooder — Shop-Categorized Shopping Lists (v1.1 Design)

## Purpose

The v1 shopping list is a single flat list. In practice, Dvir and Mai buy
different things at different kinds of stores on different trips (a
supermarket run vs. a pharmacy run), and want the app to organize the list
by shop so each trip only shows what's relevant to it. This is the second
sub-project in the food domain, building on the v1 shared shopping list
(see `docs/superpowers/specs/2026-09-12-fooder-shopping-list-design.md`).

## Scope

In scope:
- A `Shop` entity: just a name, nothing else. Pre-seeded with three
  defaults: סופרמרקט (supermarket), גוד פארם (Good Pharm), סופר-פארם
  (Super-Pharm).
- Every active list item belongs to exactly one shop.
- The same product can independently appear as separate items across
  different shops at the same time (e.g. "שקיות" needed at both the
  supermarket and the pharmacy) — items are scoped per shop, not per
  product.
- Users can add new shops from the app. New shops are shared data (both
  Dvir and Mai see them), synced live via the existing SSE mechanism.
- The list screen shows a tab per shop; the active tab filters which
  items are visible. Adding a new item adds it to the currently active
  shop's tab.

Explicitly out of scope for this sub-project:
- Renaming or deleting shops (only creation, for now).
- Per-shop catalog/history — the product catalog (quick-add search,
  purchase history/frequency stats) remains shop-agnostic; a product's
  history isn't scoped to which shop it was bought at.
- Reordering shop tabs, custom tab colors/icons, or any shop-level
  settings beyond a name.

## Architecture

No changes to the overall architecture from the v1 design (React + Vite +
TypeScript frontend, Express + Prisma + Postgres backend, SSE for
realtime sync, no auth). This sub-project only adds one table, one
foreign key, two endpoints, and a tab-based filtering UI on top of the
existing structure.

## Data Model

```
Shop
  id            (pk)
  name          text, required
  createdAt     timestamp

ShoppingListItem   (modified)
  id            (pk)
  productId     fk -> Product
  shopId        fk -> Shop        <-- new, required
  quantity      text, optional
  note          text, optional
  createdAt     timestamp
```

`Product` (the catalog/history table) is unchanged — it stays shop-agnostic.
`ShoppingListItem.shopId` is required (`NOT NULL`); a migration seeds the
three default shops and assigns any pre-existing `ShoppingListItem` rows
to the first one (סופרמרקט), so the schema change is safe against
whatever real data currently exists in the production database.

## API

New endpoints:
- `GET /api/shops` — returns all shops (`id`, `name`, `createdAt`),
  ordered by `createdAt` ascending (defaults first, in seed order, then
  user-created ones in creation order).
- `POST /api/shops` — creates a new shop; body `{ name: string }`,
  trimmed, required. Returns `201` with the created shop. Broadcasts the
  existing SSE `list-changed` event (reusing the v1 mechanism rather than
  introducing a new event type) so a new shop tab appears live on the
  other person's device.

Modified endpoints:
- `GET /api/list` — response shape gains the item's `shopId`, plus the
  shop's `name` via a `shop: { id, name }` sub-object (mirroring how
  `product` is already included). No new query parameters — the frontend
  fetches the full list once and filters by shop client-side, since a
  household list is always small enough that per-tab round-trips aren't
  worth the complexity.
- `POST /api/list` — body gains a required `shopId`; `400` if missing,
  `404` if it doesn't resolve to an existing shop (mirroring the existing
  `productId` validation pattern — a `404` for "references a thing that
  doesn't exist" reads more accurately than `400`, which is reserved for
  malformed requests; this differs from an earlier draft of this section
  that said `400` for both cases).
- `PATCH /api/list/:id` — response gains the `shop` sub-object too (the
  final review caught that the initial implementation left this out,
  contradicting the frontend's `ShoppingListItem` type, which requires
  `shop` on every item).

Unchanged: `POST /api/list/:id/complete`, `DELETE /api/list/:id`,
`GET /api/products`, `POST /api/products/:id/photo`, `GET /api/events`.

## Frontend UX

- A horizontal, scrollable tab row above the list: one tab per shop
  (fetched via `GET /api/shops`), in the order returned by the API, plus
  a trailing "+" tab.
- Tapping a shop tab sets it as active; the already-fetched item list is
  filtered client-side to only the active shop's items.
- Tapping "+" opens a minimal inline prompt for a shop name; submitting
  calls `POST /api/shops`, then selects the newly created shop as active.
- The floating "+" (add item) button and its sheet are unchanged in
  behavior, except the item creation call now includes the currently
  active shop's `shopId` — no shop picker is added to the Add Item sheet.
- Default active tab on load: the first shop in the fetched list.
- The SSE listener's existing cache invalidation is extended to also
  invalidate the shops query on every `list-changed` event, so a new shop
  created on one device appears as a tab on the other without a manual
  refresh.

## Testing

Same posture as v1: backend gets real integration tests for the new
`GET/POST /api/shops` endpoints and the `shopId` validation on
`POST /api/list`, run against the existing ephemeral test database
infrastructure. Frontend continues to rely on `tsc --noEmit` plus manual
verification — no automated frontend test suite, consistent with the v1
decision for this two-person household app.

## Migration Notes

This is a schema change to a table (`ShoppingListItem`) that could in
principle already contain real rows in the shared production database,
which would require careful sequencing: create `Shop`, add `shopId` as
nullable, backfill existing rows to a default shop, then tighten to
`NOT NULL`.

**What actually happened:** before writing the implementation plan, the
production `ShoppingListItem` row count was checked directly
(`prisma.shoppingListItem.count()`) and found to be **zero**. A direct
schema push (no nullable/backfill dance) was therefore safe, and that's
what shipped: `prisma db push` applied `Shop` plus the required `shopId`
column in one step, followed by seeding the three default shops directly
via Prisma Client. If a future schema change lands after the table has
gained real rows, re-check the row count first and fall back to the
nullable → backfill → `NOT NULL` sequence described above if it's
nonzero.
