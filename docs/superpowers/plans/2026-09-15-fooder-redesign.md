# Fooder Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Fooder into a warm, maintainable RTL shopping-list app for Dvir and מאי, and add ניצת הדובדבן as a persistent default shop.

**Architecture:** Preserve the existing React/TanStack Query frontend and Express/Prisma backend. Improve the existing screen through focused component and CSS changes, and make the new shop idempotent through backend initialization so repeated deploys do not create duplicates.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, TanStack Query, Express, Prisma, Vitest, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-09-15-fooder-redesign-design.md`

## Global Constraints

- The app remains RTL and mobile-first.
- Existing real-time updates, product photos, API contracts, and profile switching remain intact.
- Do not introduce a component library or a new routing/state architecture for this pass.
- The profile name is מאי everywhere in the UI and persisted local profile selection.
- ניצת הדובדבן is created by an idempotent backend seed/startup path.

---

### Task 1: Make the default shop data deployment-safe

**Files:**
- Create: `backend/src/seed.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/tests/shops.test.ts`

**Interfaces:**
- Produces `ensureDefaultShops(): Promise<void>` for backend startup.

- [ ] **Step 1: Write the failing test**

Add a test that calls `ensureDefaultShops()` twice and asserts exactly one `ניצת הדובדבן` shop exists.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w backend -- shops.test.ts`
Expected: FAIL because the initializer does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement `ensureDefaultShops` with `prisma.shop.findFirst({ where: { name } })` followed by `create` only when absent. Await it before `app.listen` in `backend/src/index.ts`, and export it without starting the server.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w backend -- shops.test.ts`
Expected: PASS, with only one matching shop after two calls.

- [ ] **Step 5: Commit**

Run: `git add backend/src/seed.ts backend/src/index.ts backend/tests/shops.test.ts && git commit -m "feat: seed default cherry shop"`

### Task 2: Fix the profile copy and reshape the shop selector

**Files:**
- Modify: `frontend/src/components/ProfileSwitcher.tsx`
- Modify: `frontend/src/components/ShopTabs.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Preserves `ProfileSwitcher` props and `ShopTabs` props.

- [ ] **Step 1: Write the failing test**

Use the existing TypeScript/compiler checks as the regression test: change the profile union and all validation/default logic so `מאי` is the only accepted partner name.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build -w frontend`
Expected: FAIL if any old `מיי` reference remains after the intentional type change.

- [ ] **Step 3: Write minimal implementation**

Replace `מיי` with `מאי`, create a prominent shop-selector region with a heading/count area, and retain the add-shop input behavior with clear success/error feedback.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build -w frontend`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add frontend/src/components/ProfileSwitcher.tsx frontend/src/components/ShopTabs.tsx frontend/src/App.tsx && git commit -m "feat: improve profile and shop navigation"`

### Task 3: Redesign the list cards and add-item experience

**Files:**
- Modify: `frontend/src/components/ItemCard.tsx`
- Modify: `frontend/src/components/AddItemSheet.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Preserves API mutation hooks and item data types.

- [ ] **Step 1: Write the failing test**

Use the frontend production build as the test for the refactor, with explicit manual acceptance checks for active/completed sections, empty state, and add-item controls.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build -w frontend`
Expected: PASS before the visual changes; record the baseline and then use the same command after implementation.

- [ ] **Step 3: Write minimal implementation**

Add responsive item cards with a dominant completion control, secondary delete action, quantity/note hierarchy, and graceful image fallback. In `App`, render a summary, active items, a recently added/completed visual section based on the current API shape, and a useful empty state. Redesign `AddItemSheet` as an RTL dialog-like bottom sheet with a close button, focused search, optional details, product suggestions, and clear loading/error states.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build -w frontend && npm run lint -w frontend`
Expected: PASS with no TypeScript or lint errors.

- [ ] **Step 5: Commit**

Run: `git add frontend/src/App.tsx frontend/src/components/ItemCard.tsx frontend/src/components/AddItemSheet.tsx && git commit -m "feat: redesign shopping list workflow"`

### Task 4: Add the visual system and verify the production experience

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/index.html`

- [ ] **Step 1: Write the failing test**

Run the production build before the CSS pass and use the deployed browser page as the visual acceptance target.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build -w frontend`
Expected: PASS baseline; visual acceptance is not yet satisfied.

- [ ] **Step 3: Write minimal implementation**

Define the cream/ink/green palette, typography, focus states, buttons, cards, sheet backdrop, and responsive layout primitives in CSS. Ensure `dir="rtl"` and language metadata are present in `index.html`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build -w frontend && npm run lint -w frontend && npm run test -w backend`
Expected: all commands PASS.

- [ ] **Step 5: Commit**

Run: `git add frontend/src/index.css frontend/index.html && git commit -m "style: give Fooder a warm RTL visual system"`

### Task 5: Live verification

- [ ] **Step 1:** Open `https://fooder-frontend.vercel.app/` and verify the app renders in RTL with the greeting `היי, דביר`, profile option `מאי`, and shop `ניצת הדובדבן`.
- [ ] **Step 2:** Verify switching shops, opening the add sheet, adding a new item, completing it, and returning to the empty state.
- [ ] **Step 3:** Report any deployment-specific blocker rather than claiming the live deployment updated if no deployment was triggered.
