# Fooder Serious UI Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Fooder’s playful list screen with a modern RTL-first grocery/productivity UI that supports fast item search, client-side sorting, polished item CRUD, and a clear boundary for future entity-management APIs.

**Architecture:** Keep React, TanStack Query, and the existing REST API. Decompose the current monolithic screen into list-specific UI components; pure filtering/sorting logic stays in a small utility for direct test coverage. Existing mutation hooks remain the data boundary, while toast, menu, confirmation, and sheet state are local UI concerns.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4 for base utilities, custom CSS tokens, TanStack Query 5, Vitest, Testing Library, user-event.

**Spec:** `docs/superpowers/specs/2026-09-16-fooder-serious-ui-design.md`

## Global Constraints

- Keep the app Hebrew/RTL-first, responsive from 320px wide, and safe-area aware.
- Use cool off-white, white, charcoal, slate, forest green, and red only for destructive confirmation; remove emoji from functional UI.
- Use one primary action per surface; keep secondary and destructive item commands in progressive disclosure.
- Do not invent shop/product mutation endpoints; item CRUD uses only existing list APIs.
- Search filters the active shop locally by product name, category, quantity, and note; sort choices are newest, name, and category.
- Icon-only controls require Hebrew accessible names; controls must have 44px minimum touch targets and visible focus styles.
- Write and run each failing test before production code; commit each independently testable task.

---

## File structure

- Create `frontend/src/lib/listPresentation.ts`: pure filtering/sorting helpers and `ListSort` type.
- Create `frontend/src/lib/listPresentation.test.ts`: unit coverage for search/sort, Hebrew strings, and no-result cases.
- Create `frontend/src/components/ListToolbar.tsx`: scoped list search and sort menu.
- Create `frontend/src/components/ItemActionsMenu.tsx`: accessible item overflow menu and destructive confirmation dialog.
- Create `frontend/src/components/ShoppingList.tsx`: filtered/sorted active-list rendering and no-search-results state.
- Create `frontend/src/components/CompletedItems.tsx`: collapsed completed/undo region.
- Create `frontend/src/components/Toast.tsx`: transient success feedback with an optional action.
- Create `frontend/src/test/setup.ts`, `frontend/src/test/render.tsx`, and component test files: shared browser-like test setup and React Query test rendering.
- Modify `frontend/package.json`, `frontend/vite.config.ts`, and `frontend/tsconfig.app.json`: add test dependencies, scripts, and Vitest configuration.
- Modify `frontend/src/App.tsx`: compose the new regions and own UI state only.
- Modify `frontend/src/components/ShopTabs.tsx`: compact horizontal shop selection and create-shop sheet/action.
- Modify `frontend/src/components/ItemCard.tsx`: replace inline actions with compact row plus overflow trigger.
- Modify `frontend/src/components/AddItemSheet.tsx`: structured create/edit fields, photo selection, error persistence, and save priority.
- Modify `frontend/src/index.css`: replace the current decorative stylesheet with design tokens and component styles.

## Task 1: Add a frontend test foundation and list-presentation utility

**Files:**
- Create: `frontend/src/lib/listPresentation.ts`
- Create: `frontend/src/lib/listPresentation.test.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/render.tsx`
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tsconfig.app.json`

**Interfaces:**
- Consumes: `ShoppingListItem` from `frontend/src/api/types.ts`.
- Produces: `ListSort = "newest" | "name" | "category"`; `filterAndSortItems(items, query, sort): ShoppingListItem[]`; `renderWithClient(ui): RenderResult`.

- [ ] **Step 1: Add the test runner and browser test dependencies**

Update `frontend/package.json` with these dev dependencies and scripts:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
},
"devDependencies": {
  "@testing-library/jest-dom": "latest",
  "@testing-library/react": "latest",
  "@testing-library/user-event": "latest",
  "jsdom": "latest",
  "vitest": "latest"
}
```

Configure Vite test options with `environment: "jsdom"`, `setupFiles: "./src/test/setup.ts"`, and CSS enabled. Add `"vitest/globals"` to `types` in `tsconfig.app.json`.

- [ ] **Step 2: Write the failing list-presentation tests**

Create `frontend/src/lib/listPresentation.test.ts` with fixed Hebrew fixtures and these cases:

```ts
it("matches a normalized Hebrew product name, category, quantity, or note", () => {
  expect(filterAndSortItems(items, "חלב", "newest").map(({ id }) => id)).toEqual(["milk"]);
  expect(filterAndSortItems(items, "מקרר", "newest").map(({ id }) => id)).toEqual(["milk"]);
  expect(filterAndSortItems(items, "2", "newest").map(({ id }) => id)).toEqual(["milk"]);
  expect(filterAndSortItems(items, "ללא לקטוז", "newest").map(({ id }) => id)).toEqual(["milk"]);
});

it("sorts matching items by name and category without mutating the source", () => {
  const original = [...items];
  expect(filterAndSortItems(items, "", "name").map(({ id }) => id)).toEqual(["bread", "milk"]);
  expect(filterAndSortItems(items, "", "category").map(({ id }) => id)).toEqual(["milk", "bread"]);
  expect(items).toEqual(original);
});

it("returns no items when a query has no match", () => {
  expect(filterAndSortItems(items, "פסטה", "newest")).toEqual([]);
});
```

- [ ] **Step 3: Run the focused test to verify it fails**

Run: `npm test --prefix frontend -- listPresentation.test.ts`

Expected: FAIL because `listPresentation.ts` does not exist.

- [ ] **Step 4: Implement the minimal pure helper**

Create `frontend/src/lib/listPresentation.ts`:

```ts
import type { ShoppingListItem } from "../api/types";

export type ListSort = "newest" | "name" | "category";

export function filterAndSortItems(items: ShoppingListItem[], query: string, sort: ListSort) {
  const normalizedQuery = query.trim().toLocaleLowerCase("he");
  const matching = items.filter((item) =>
    [item.product.name, item.product.category, item.quantity, item.note]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase("he").includes(normalizedQuery))
  );

  return [...matching].sort((left, right) => {
    if (sort === "name") return left.product.name.localeCompare(right.product.name, "he");
    if (sort === "category") return (left.product.category ?? "").localeCompare(right.product.category ?? "", "he") || left.product.name.localeCompare(right.product.name, "he");
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}
```

Create `frontend/src/test/setup.ts` importing `@testing-library/jest-dom/vitest`; create `render.tsx` with a fresh `QueryClient` whose retries are disabled and a `QueryClientProvider` wrapper.

- [ ] **Step 5: Run focused tests, then the frontend build**

Run: `npm test --prefix frontend -- listPresentation.test.ts`

Expected: PASS for all three cases.

Run: `npm run build --prefix frontend`

Expected: exit code 0.

- [ ] **Step 6: Commit the test foundation**

```bash
git add frontend/package.json frontend/vite.config.ts frontend/tsconfig.app.json frontend/src/lib/listPresentation.ts frontend/src/lib/listPresentation.test.ts frontend/src/test/setup.ts frontend/src/test/render.tsx package-lock.json
git commit -m "test: add frontend list presentation coverage"
```

## Task 2: Build and test the searchable, sortable list toolbar

**Files:**
- Create: `frontend/src/components/ListToolbar.tsx`
- Create: `frontend/src/components/ListToolbar.test.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: `ListSort` from `listPresentation.ts`, `value: string`, `onSearchChange(value: string): void`, `sort: ListSort`, and `onSortChange(sort: ListSort): void`.
- Produces: an accessible toolbar that labels its search scope with `shopName` and reports the selected sort.

- [ ] **Step 1: Write the failing toolbar interaction test**

```tsx
it("updates search and chooses a visible sort option", async () => {
  const user = userEvent.setup();
  const onSearchChange = vi.fn();
  const onSortChange = vi.fn();
  render(<ListToolbar shopName="ניצת הדובדבן" value="" onSearchChange={onSearchChange} sort="newest" onSortChange={onSortChange} />);

  await user.type(screen.getByRole("searchbox", { name: "חיפוש ברשימת ניצת הדובדבן" }), "חלב");
  await user.click(screen.getByRole("button", { name: "מיון: חדש ביותר" }));
  await user.click(screen.getByRole("menuitemradio", { name: "לפי שם" }));

  expect(onSearchChange).toHaveBeenLastCalledWith("חלב");
  expect(onSortChange).toHaveBeenCalledWith("name");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --prefix frontend -- ListToolbar.test.tsx`

Expected: FAIL because `ListToolbar` is missing.

- [ ] **Step 3: Implement `ListToolbar`**

Render a `search` landmark containing a `searchbox` with Hebrew accessible label `חיפוש ברשימת ${shopName}` and a labeled sort button. The sort button opens a `role="menu"` with three `menuitemradio` options: `חדש ביותר`, `לפי שם`, and `לפי קטגוריה`. Close the menu after selection and on Escape; update `aria-expanded` and keep text labels visible.

- [ ] **Step 4: Add component styles**

Add `.list-toolbar`, `.list-search`, `.sort-control`, and `.sort-menu` rules using white surface, slate border, 44px minimum controls, and RTL-aligned menu placement. Do not use emoji or color-only selection states.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test --prefix frontend -- ListToolbar.test.tsx`

Expected: PASS.

Run: `npm run build --prefix frontend`

Expected: exit code 0.

- [ ] **Step 6: Commit the toolbar**

```bash
git add frontend/src/components/ListToolbar.tsx frontend/src/components/ListToolbar.test.tsx frontend/src/index.css
git commit -m "feat: add shopping list search and sorting"
```

## Task 3: Replace inline row actions with an accessible overflow menu and confirmation

**Files:**
- Create: `frontend/src/components/ItemActionsMenu.tsx`
- Create: `frontend/src/components/ItemActionsMenu.test.tsx`
- Modify: `frontend/src/components/ItemCard.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: `itemName: string`, `onEdit(): void`, `onDelete(): void`.
- Produces: `ItemActionsMenu`, which has a menu trigger, edit command, delete command, and deletion confirmation dialog.

- [ ] **Step 1: Write the failing actions-menu test**

```tsx
it("requires confirmation before deleting an item", async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn();
  render(<ItemActionsMenu itemName="חלב" onEdit={vi.fn()} onDelete={onDelete} />);

  await user.click(screen.getByRole("button", { name: "פעולות עבור חלב" }));
  await user.click(screen.getByRole("menuitem", { name: "מחק" }));
  expect(screen.getByRole("dialog", { name: "מחיקת חלב" })).toBeVisible();
  expect(onDelete).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "מחק פריט" }));
  expect(onDelete).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --prefix frontend -- ItemActionsMenu.test.tsx`

Expected: FAIL because `ItemActionsMenu` is missing.

- [ ] **Step 3: Implement `ItemActionsMenu` and update `ItemCard`**

Use a text-independent three-dots icon rendered with CSS/SVG and a visible Hebrew `aria-label`. Menu commands are `עריכה` and `מחק`; choosing delete closes the menu and opens a `role="alertdialog"` naming the item. The dialog has `ביטול` and red `מחק פריט` controls. Update `ItemCard` to render only image, product data, a 44px completion target, and `ItemActionsMenu`; pass existing edit/delete callbacks through it.

- [ ] **Step 4: Add compact row styles**

Use 48px image/placeholder, a flexible text column, subtle row separator or border, and a 44px icon action area. Remove the separate edit and delete text/button treatment.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test --prefix frontend -- ItemActionsMenu.test.tsx`

Expected: PASS.

Run: `npm run build --prefix frontend`

Expected: exit code 0.

- [ ] **Step 6: Commit the item actions**

```bash
git add frontend/src/components/ItemActionsMenu.tsx frontend/src/components/ItemActionsMenu.test.tsx frontend/src/components/ItemCard.tsx frontend/src/index.css
git commit -m "feat: streamline shopping item actions"
```

## Task 4: Rework create/edit into a robust item sheet

**Files:**
- Modify: `frontend/src/components/AddItemSheet.tsx`
- Create: `frontend/src/components/AddItemSheet.test.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: current `AddItemSheetProps` plus `item?: ShoppingListItem` and existing `useAddItem`, `useUpdateItem`, and `useUploadProductPhoto` hooks.
- Produces: a create/edit form that preserves fields and selected file on mutation error; create mode starts at product search while edit mode displays product identity read-only.

- [ ] **Step 1: Write failing edit-mode and error-preservation tests**

```tsx
it("shows product identity as read-only while allowing item details to be edited", () => {
  render(<AddItemSheet shopId="shop-1" item={milkItem} onClose={vi.fn()} />);
  expect(screen.getByDisplayValue("חלב")).toHaveAttribute("readonly");
  expect(screen.getByDisplayValue("2")).not.toHaveAttribute("readonly");
});

it("keeps item fields visible after a save error", async () => {
  mockUpdateItemError();
  const user = userEvent.setup();
  render(<AddItemSheet shopId="shop-1" item={milkItem} onClose={vi.fn()} />);
  await user.clear(screen.getByLabelText("כמות"));
  await user.type(screen.getByLabelText("כמות"), "3");
  await user.click(screen.getByRole("button", { name: "שמור שינויים" }));
  expect(await screen.findByText("לא הצלחנו לשמור את השינויים. נסו שוב.")).toBeVisible();
  expect(screen.getByLabelText("כמות")).toHaveValue("3");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test --prefix frontend -- AddItemSheet.test.tsx`

Expected: FAIL because the sheet does not provide label-based fields or the specified failure copy.

- [ ] **Step 3: Implement the structured form**

Add visible Hebrew labels for product, quantity, note, and photo. In create mode, render product suggestions only after a meaningful search query; keep the name field first. Group quantity, note, and photo under an `פרטים נוספים` disclosure that is open when any detail has a value. In edit mode, keep product identity read-only and support quantity, note, and image replacement. Do not close the sheet until all selected mutations succeed; on photo-upload failure keep the sheet open and show retry copy.

- [ ] **Step 4: Add sticky action and sheet focus behavior**

Focus the create name input or edit sheet heading on open. Preserve the invoking element with a ref and restore focus when the sheet closes. Make the save button sticky to the bottom of the sheet and leave only a quiet cancel control beside it. Escape and a backdrop click close only when no mutation is pending.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test --prefix frontend -- AddItemSheet.test.tsx`

Expected: PASS.

Run: `npm run build --prefix frontend`

Expected: exit code 0.

- [ ] **Step 6: Commit the item sheet**

```bash
git add frontend/src/components/AddItemSheet.tsx frontend/src/components/AddItemSheet.test.tsx frontend/src/index.css
git commit -m "feat: polish item create and edit sheet"
```

## Task 5: Compose filterable active and completed list regions with undo feedback

**Files:**
- Create: `frontend/src/components/ShoppingList.tsx`
- Create: `frontend/src/components/ShoppingList.test.tsx`
- Create: `frontend/src/components/CompletedItems.tsx`
- Create: `frontend/src/components/Toast.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: active `ShoppingListItem[]`, `query`, `sort`, `onComplete(id)`, `onEdit(item)`, and `onDelete(id)`.
- Produces: `ShoppingList`, which uses `filterAndSortItems`; `CompletedItems`, which is collapsed by default; `Toast`, which accepts `message`, `actionLabel?`, `onAction?`, `onDismiss()`.

- [ ] **Step 1: Write failing active-list and completed-list tests**

```tsx
it("shows a useful no-results state for a filtered list", () => {
  render(<ShoppingList items={[milkItem]} query="פסטה" sort="newest" onComplete={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
  expect(screen.getByText("לא נמצאו פריטים" )).toBeVisible();
  expect(screen.getByText("חפשו מונח אחר או הוסיפו פריט חדש.")).toBeVisible();
});

it("keeps completed items collapsed until expanded", async () => {
  const user = userEvent.setup();
  render(<CompletedItems items={[milkItem]} onRestore={vi.fn()} />);
  expect(screen.queryByText("חלב")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "פריטים שנקנו (1)" }));
  expect(screen.getByText("חלב")).toBeVisible();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --prefix frontend -- ShoppingList.test.tsx`

Expected: FAIL because the regions do not exist.

- [ ] **Step 3: Implement the list regions and App composition**

Move filtering/sorting from `App` into `ShoppingList`. Distinguish an empty shop (`אין פריטים ברשימה`) from a filtered-empty list (`לא נמצאו פריטים`) and always leave the global `הוסף פריט` action available. `CompletedItems` is collapsed by default and uses the existing restore mutation. Replace inline recently-bought chips with a `Toast` that says `סומן כנקנה` and has a `בטל` action for the latest completion; keep the collapsed history for the last three items.

- [ ] **Step 4: Wire delete, completion, and restoration feedback**

After confirmed delete, invalidate the list as the existing mutation does and show `הפריט נמחק`. On completion, record the item for the toast/undo and append to completed history only on success. On restore, remove it from history only on success. Do not make destructive deletion optimistic.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test --prefix frontend -- ShoppingList.test.tsx`

Expected: PASS.

Run: `npm run build --prefix frontend`

Expected: exit code 0.

- [ ] **Step 6: Commit the list regions**

```bash
git add frontend/src/components/ShoppingList.tsx frontend/src/components/ShoppingList.test.tsx frontend/src/components/CompletedItems.tsx frontend/src/components/Toast.tsx frontend/src/App.tsx frontend/src/index.css
git commit -m "feat: organize active and completed shopping items"
```

## Task 6: Rebuild the app shell and shop switcher around the visual system

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/ShopTabs.tsx`
- Modify: `frontend/src/components/ProfileSwitcher.tsx`
- Modify: `frontend/src/index.css`
- Create: `frontend/src/components/ShopTabs.test.tsx`

**Interfaces:**
- Consumes: existing shop read/create hooks and `activeShopId`, `onSelect(shopId)`.
- Produces: a compact horizontal shop selector with an accessible current-shop state and a create-shop interaction that only uses the existing POST API.

- [ ] **Step 1: Write the failing shop-switcher test**

```tsx
it("selects a shop from a horizontally scrollable tab list and exposes a labeled create action", async () => {
  const user = userEvent.setup();
  render(<ShopTabs activeShopId="shop-1" onSelect={onSelect} />);
  await user.click(await screen.findByRole("tab", { name: "סופר-פארם" }));
  expect(onSelect).toHaveBeenCalledWith("shop-2");
  expect(screen.getByRole("button", { name: "הוספת חנות" })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --prefix frontend -- ShopTabs.test.tsx`

Expected: FAIL because the current grid and unlabeled-plus action do not meet the required structure.

- [ ] **Step 3: Implement the modern shell and compact shop selection**

Use a modest header with Fooder label, active profile, and compact profile switcher. Render shops in a horizontal `tablist` with `overflow-x: auto`, 44px tab targets, a visible selected state, and a labelled `הוספת חנות` button. Reuse the existing create-shop API in a short sheet/popover; do not add edit/delete shop controls before their APIs exist. Place list toolbar directly below this region.

- [ ] **Step 4: Replace global CSS with component tokens and responsive layout**

Define CSS custom properties for background, surface, ink, muted, border, primary, danger, radius, and shadow. Use a 640px content max-width; add bottom safe-area padding for the add action; ensure rows and toolbar remain usable at 320px and show a two-column detail layout only when 560px wide or larger. Add `@media (prefers-reduced-motion: reduce)` to disable nonessential transitions.

- [ ] **Step 5: Run focused test, full frontend tests, lint, and build**

Run: `npm test --prefix frontend -- ShopTabs.test.tsx`

Expected: PASS.

Run: `npm test --prefix frontend`

Expected: PASS with all frontend tests green.

Run: `npm run lint --prefix frontend`

Expected: exit code 0.

Run: `npm run build --prefix frontend`

Expected: exit code 0.

- [ ] **Step 6: Commit the app shell**

```bash
git add frontend/src/App.tsx frontend/src/components/ShopTabs.tsx frontend/src/components/ProfileSwitcher.tsx frontend/src/components/ShopTabs.test.tsx frontend/src/index.css
git commit -m "feat: redesign Fooder shopping workspace"
```

## Task 7: Full regression and visual-quality verification

**Files:**
- Modify only if a verified defect is found in files from Tasks 1–6.

**Interfaces:**
- Consumes: completed frontend modules and current backend contracts.
- Produces: verified frontend build, backend regression result, and documented visual QA observations.

- [ ] **Step 1: Run the full test suites**

Run: `npm test --prefix frontend`

Expected: every frontend test passes.

Run: `npm test --prefix backend -- --run`

Expected: all backend tests pass unchanged.

- [ ] **Step 2: Run static verification**

Run: `npm run lint --prefix frontend`

Expected: exit code 0.

Run: `npm run build --prefix frontend`

Expected: exit code 0.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 3: Perform visual QA in a mobile and desktop viewport**

Run the frontend with `npm run dev --prefix frontend`, then verify at 390px and 1280px wide:

```text
- Active shop is apparent and can be selected without horizontal-layout breakage.
- Search filters Hebrew product names, categories, quantities, and notes.
- All three sorts work and selected sort is visible.
- Add, edit, image replacement, completion/undo, and delete confirmation work.
- Empty-shop and no-search-results states differ and remain compact.
- Sheets, menus, and toasts respect RTL, focus, Escape, and safe-area spacing.
- No functional emoji, dashed normal controls, oversized empty-state art, or multi-action row clutter remains.
```

- [ ] **Step 4: Commit any visual QA correction**

Only if Step 3 found and fixed a defect:

```bash
git add <exact changed frontend paths>
git commit -m "fix: polish Fooder responsive interactions"
```

- [ ] **Step 5: Push the completed work**

Run: `git push origin main`

Expected: the branch reports that the committed UI-upgrade series has been pushed.
