# Fooder Cobalt Ledger UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a compact, modern, cobalt-accented RTL shopping workspace while retaining every existing Fooder list and shop behavior.

**Architecture:** Keep existing API hooks, mutations, and `App` state ownership. Replace presentation boundaries only: a compact account trigger, a selected-shop selector sheet, a soft search/sort toolbar, text-first item rows, and shared Ledger tokens in `index.css`. Components remain controlled; no API contract changes or mock CRUD endpoints are introduced.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tailwind import plus repository CSS, React Query hooks.

**Spec:** `docs/superpowers/specs/2026-09-16-fooder-cobalt-ledger-design.md`

## Global Constraints

- Hebrew/RTL is the default; use logical CSS properties rather than physical left/right positioning.
- Use semantic Ledger tokens: `#F8F8FA`, `#FFFFFF`, `#15161A`, `#81838C`, `#EBECF0`, and cobalt `#4169E1`; never add green normal-state UI surfaces.
- Keep all interactive targets at least 44px, including visually compact icon controls.
- Do not change list, product-photo, or shop API hooks and do not invent backend CRUD endpoints.
- Preserve focus return for menus, dialogs, sheets, and destructive confirmation; preserve reduced-motion behavior.
- Cobalt is never the sole indicator for selection, completion, or error.
- Run frontend tests/build/typecheck/lint and backend tests before the final commit/push.

---

## File map

| File | Responsibility after this work |
|---|---|
| `frontend/src/index.css` | Semantic Cobalt Ledger tokens, responsive layout, all component presentation, dark/increased-contrast token overrides. |
| `frontend/src/App.tsx` | Data/mutation orchestration and the new main workspace order. |
| `frontend/src/components/ProfileSwitcher.tsx` | Compact account trigger that reveals profile choices without an always-visible segmented control. |
| `frontend/src/components/ShopSelector.tsx` | Selected-shop line plus accessible selection/create-shop sheet. Replaces `ShopTabs.tsx`. |
| `frontend/src/components/ListToolbar.tsx` | Soft search and icon-only accessible sort menu. |
| `frontend/src/components/ItemCard.tsx` | Dense text-first `ItemRow` rendering under the existing filename. |
| `frontend/src/components/ShoppingList.tsx` | Plain active list and concise empty/search-empty states. |
| `frontend/src/components/CompletedItems.tsx` | Text-first completed disclosure and compact restore rows. |
| `frontend/src/components/AddItemSheet.tsx` | Ledger presentation hooks/labels for form, suggestions, optional details, and sticky actions. |
| `frontend/src/components/Toast.tsx`, `ItemActionsMenu.tsx` | Quiet token-aligned feedback/actions without behavior changes. |
| `frontend/src/components/*.test.tsx`, `frontend/src/App.test.tsx` | Regression coverage for new accessible structure and existing workflows. |

## Task 1: Establish the Ledger foundation and compact account trigger

**Files:**
- Modify: `frontend/src/components/ProfileSwitcher.tsx`
- Create: `frontend/src/components/ProfileSwitcher.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: `Profile`, `useProfile`, and `onChange(profile: Profile)` from the current `ProfileSwitcher`.
- Produces: an account trigger with `aria-haspopup="menu"`, an `aria-expanded` state, and profile menu items named `דביר` and `מאי`; all later layout tasks rely on `.profile-trigger`, `.profile-menu`, and Ledger tokens.

- [ ] **Step 1: Write the failing compact-profile tests**

```tsx
it("keeps profile choices out of the header until the compact account trigger opens", async () => {
  const user = userEvent.setup();
  render(<ProfileSwitcher profile="דביר" onChange={onChange} />);

  expect(screen.getByRole("button", { name: "פרופיל: דביר" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("menuitemradio", { name: "מאי" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "פרופיל: דביר" }));
  await user.click(screen.getByRole("menuitemradio", { name: "מאי" }));
  expect(onChange).toHaveBeenCalledWith("מאי");
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm run test --prefix frontend -- ProfileSwitcher.test.tsx`

Expected: FAIL because the existing segmented buttons and menu roles do not exist.

- [ ] **Step 3: Implement the compact trigger and Ledger shell**

```tsx
<div className="profile-menu-root">
  <button
    ref={triggerRef}
    type="button"
    className="profile-trigger"
    aria-label={`פרופיל: ${profile}`}
    aria-haspopup="menu"
    aria-expanded={isOpen}
    onClick={() => setIsOpen((open) => !open)}
  >
    {profile.slice(0, 1)}
  </button>
  {isOpen && (
    <div className="profile-menu" role="menu">
      {(["דביר", "מאי"] as const).map((name) => (
        <button key={name} type="button" role="menuitemradio" aria-checked={name === profile} onClick={() => selectProfile(name)}>{name}</button>
      ))}
    </div>
  )}
</div>
```

Define `--color-bg`, `--color-surface`, `--color-ink`, `--color-muted`, `--color-border`, `--color-primary`, `--color-primary-soft`, and `--color-danger` in `:root`; replace forest-green values and prominent pill/card styling with Ledger values. Add `@media (prefers-color-scheme: dark)` and `@media (prefers-contrast: more)` overrides for these semantic tokens. Update the `App` header class structure only as needed for the compact trigger.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test --prefix frontend -- ProfileSwitcher.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run the affected application regression test**

Run: `npm run test --prefix frontend -- App.test.tsx`

Expected: PASS after updating role/name expectations only where the profile control is asserted.

- [ ] **Step 6: Commit the foundation**

```bash
git add frontend/src/App.tsx frontend/src/index.css frontend/src/components/ProfileSwitcher.tsx frontend/src/components/ProfileSwitcher.test.tsx
git commit -m "feat: establish cobalt ledger foundation"
```

## Task 2: Replace the shop chip rail with an accessible selected-shop selector

**Files:**
- Create: `frontend/src/components/ShopSelector.tsx`
- Create: `frontend/src/components/ShopSelector.test.tsx`
- Modify: `frontend/src/App.tsx`
- Delete: `frontend/src/components/ShopTabs.tsx`
- Delete: `frontend/src/components/ShopTabs.test.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: `activeShopId: string | null` and `onSelect(shopId: string) => void`; reads shops with `useShopsQuery()` and creates with `useAddShop()`.
- Produces: `<ShopSelector activeShopId={activeShopId} onSelect={setActiveShopId} />`, a button named `החלפת חנות: שופרסל` when Shufersal is active, and a dialog labelled `בחירת חנות`.

- [ ] **Step 1: Write failing selector interaction tests**

```tsx
it("shows only the active shop on the page and selects another shop from its dialog", async () => {
  const user = userEvent.setup();
  render(<ShopSelector activeShopId="shop-1" onSelect={onSelect} />);

  await user.click(screen.getByRole("button", { name: "החלפת חנות: שופרסל" }));
  expect(screen.getByRole("dialog", { name: "בחירת חנות" })).toBeVisible();
  await user.click(screen.getByRole("option", { name: "סופר-פארם" }));

  expect(onSelect).toHaveBeenCalledWith("shop-2");
  expect(screen.queryByRole("dialog", { name: "בחירת חנות" })).not.toBeInTheDocument();
});

it("creates a shop from the selection dialog and restores focus to the selector", async () => {
  addShopMutation.mutate.mockImplementation((name, options) => {
    options?.onSuccess?.({ id: "shop-3", name, createdAt: "2026-09-16T00:00:00.000Z" });
  });
  const user = userEvent.setup();
  render(<ShopSelector activeShopId="shop-1" onSelect={onSelect} />);
  const trigger = screen.getByRole("button", { name: "החלפת חנות: שופרסל" });
  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "הוספת חנות" }));
  await user.type(screen.getByRole("textbox", { name: "שם החנות החדשה" }), "רמי לוי");
  await user.click(screen.getByRole("button", { name: "הוסף" }));
  expect(onSelect).toHaveBeenCalledWith("shop-3");
  expect(trigger).toHaveFocus();
});
```

- [ ] **Step 2: Run the selector test to verify it fails**

Run: `npm run test --prefix frontend -- ShopSelector.test.tsx`

Expected: FAIL because `ShopSelector` does not exist.

- [ ] **Step 3: Implement the selection/create surface**

```tsx
<button
  ref={triggerRef}
  type="button"
  className="shop-selector-trigger"
  aria-haspopup="dialog"
  aria-expanded={isOpen}
  onClick={() => setIsOpen(true)}
>
  <span className="shop-selector-mark" aria-hidden="true" />
  <span>{activeShop?.name ?? "בחירת חנות"}</span>
  <span className="shop-selector-hint">החלפה</span>
</button>
```

Render a modal/sheet dialog with `role="dialog"`, `aria-modal="true"`, and a native button list using `role="listbox"`/`role="option"`. Move focus into the dialog, support Escape, and return it to `triggerRef` on close. Keep the existing `useAddShop` workflow and inline form error; place the add-shop command at the end of the list. Replace the `ShopTabs` import in `App`, then remove its files. Style the on-page trigger as one text-first divider row; do not render shop chips on the main screen.

- [ ] **Step 4: Run selector and app tests to verify the change**

Run: `npm run test --prefix frontend -- ShopSelector.test.tsx App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the selector migration**

```bash
git add frontend/src/App.tsx frontend/src/index.css frontend/src/components/ShopSelector.tsx frontend/src/components/ShopSelector.test.tsx frontend/src/components/ShopTabs.tsx frontend/src/components/ShopTabs.test.tsx
git commit -m "feat: streamline shop selection"
```

## Task 3: Make search, sort, list rows, and completed history dense and text-first

**Files:**
- Modify: `frontend/src/components/ListToolbar.tsx`
- Modify: `frontend/src/components/ListToolbar.test.tsx`
- Modify: `frontend/src/components/ItemCard.tsx`
- Modify: `frontend/src/components/ShoppingList.tsx`
- Modify: `frontend/src/components/ShoppingList.test.tsx`
- Modify: `frontend/src/components/CompletedItems.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: existing `ListToolbarProps`, `ShoppingListProps`, and `CompletedItemsProps` unchanged.
- Produces: an icon-only sort trigger named `מיון: חדש ביותר` by default; item rows with current completion/action accessible labels; completed disclosure named `נקנה (1)` for a one-item history.

- [ ] **Step 1: Update tests to describe the modern structural contract**

```tsx
expect(screen.getByRole("button", { name: "מיון: חדש ביותר" })).toHaveAttribute("aria-label", "מיון: חדש ביותר");
expect(screen.getByRole("list", { name: "פריטים לקנייה" })).toBeVisible();
expect(screen.getByRole("button", { name: "סמן את חלב כנקנה" })).toBeVisible();

await user.click(screen.getByRole("button", { name: "נקנה (1)" }));
expect(screen.getByRole("button", { name: "שחזור חלב" })).toBeVisible();
```

Add a `photoUrl` item fixture and assert that a default active row has no `<img>` even when a photo exists; the product name and metadata remain rendered. Change empty-state assertions to expect the existing Hebrew heading/copy but no `.empty-icon` decoration.

- [ ] **Step 2: Run the focused component tests to verify they fail**

Run: `npm run test --prefix frontend -- ListToolbar.test.tsx ShoppingList.test.tsx`

Expected: FAIL because the controls retain text-button/card-specific structure and the completed label is different.

- [ ] **Step 3: Implement the dense list treatment without altering data behavior**

```tsx
<button
  ref={sortTriggerRef}
  type="button"
  className="sort-trigger"
  aria-label={`מיון: ${selectedSort.label}`}
  aria-haspopup="menu"
  aria-expanded={isMenuOpen}
>
  <SortIcon aria-hidden="true" />
</button>
```

In `ItemCard`, remove the mandatory thumbnail and outer card shadow. Render a semantic `li` with completion target, name, one merged metadata line, and `ItemActionsMenu`; preserve product name in all action labels. In `ShoppingList`, give the active `ul` `aria-label="פריטים לקנייה"`; retain filtering/sorting in `filterAndSortItems`. Remove decorative empty-state icon markup. In `CompletedItems`, rename the disclosure to `נקנה (${items.length})`, use a divider/text treatment, retain restore mutation wiring, and keep the list collapsed initially. Style visual rows at 56px minimum with 44px completion/more hit targets, separators, no per-row card border/radius/shadow, and muted contextual metadata.

- [ ] **Step 4: Run component tests to verify they pass**

Run: `npm run test --prefix frontend -- ListToolbar.test.tsx ShoppingList.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run presentation utility tests to protect search/sort behavior**

Run: `npm run test --prefix frontend -- src/lib/listPresentation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit dense list changes**

```bash
git add frontend/src/index.css frontend/src/components/ListToolbar.tsx frontend/src/components/ListToolbar.test.tsx frontend/src/components/ItemCard.tsx frontend/src/components/ShoppingList.tsx frontend/src/components/ShoppingList.test.tsx frontend/src/components/CompletedItems.tsx
git commit -m "feat: modernize shopping list presentation"
```

## Task 4: Apply Ledger presentation to sheet, menus, feedback, and responsive safe areas

**Files:**
- Modify: `frontend/src/components/AddItemSheet.tsx`
- Modify: `frontend/src/components/AddItemSheet.test.tsx`
- Modify: `frontend/src/components/ItemActionsMenu.tsx`
- Modify: `frontend/src/components/ItemActionsMenu.test.tsx`
- Modify: `frontend/src/components/Toast.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: existing `AddItemSheetProps`, action-menu callbacks, toast props, and `App` mutation handlers unchanged.
- Produces: `.ledger-sheet`, `.sheet-save-action`, compact fixed `.add-button`, and feedback surfaces that are positioned above the safe area and primary add target.

- [ ] **Step 1: Write failing UI contract regressions**

```tsx
it("keeps the sticky save action and the compact add control separately labelled", async () => {
  render(<AddItemSheet shopId="shop-1" onClose={vi.fn()} />);
  expect(screen.getByRole("button", { name: "הוסף פריט" })).toHaveClass("sheet-save-action");
});

it("keeps the add-item control available as a labelled compact action", async () => {
  render(<App />);
  expect(await screen.findByRole("button", { name: "הוספת פריט" })).toBeEnabled();
});
```

Update action-menu assertions to verify the trigger remains `פעולות עבור חלב` and delete confirmation keeps `alertdialog`; retain the existing toast behavior assertions.

- [ ] **Step 2: Run the affected tests to verify they fail**

Run: `npm run test --prefix frontend -- AddItemSheet.test.tsx ItemActionsMenu.test.tsx App.test.tsx`

Expected: FAIL because existing class names and add-button accessible name do not match the Ledger contract.

- [ ] **Step 3: Implement the final presentation pass**

```tsx
<button
  type="button"
  onClick={() => setIsAdding(true)}
  disabled={!activeShopId}
  className="add-button"
  aria-label="הוספת פריט"
>
  <span aria-hidden="true">＋</span>
</button>
```

Add `sheet-save-action` to the sticky save button and retain its existing pending/error behavior. Keep the sheet’s white surface, restrained radius, product search first, optional-details disclosure, image upload, and focus return. Remove excess box chrome from suggestions, action menus, confirmation dialog, toast, and state panels; use Ledger separators and short shadows only for overlays. Position the compact add control on the RTL trailing inline edge, above `env(safe-area-inset-bottom)`, and set toast bottom spacing so it never overlaps the control. At `max-width: 480px`, keep content padding compact and targets 44px; at desktop widths keep the reading column bounded at 640px.

- [ ] **Step 4: Run sheet, action, toast, and application regressions**

Run: `npm run test --prefix frontend -- AddItemSheet.test.tsx ItemActionsMenu.test.tsx ShoppingList.test.tsx App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the final UI surfaces**

```bash
git add frontend/src/App.tsx frontend/src/index.css frontend/src/components/AddItemSheet.tsx frontend/src/components/AddItemSheet.test.tsx frontend/src/components/ItemActionsMenu.tsx frontend/src/components/ItemActionsMenu.test.tsx frontend/src/components/Toast.tsx frontend/src/App.test.tsx
git commit -m "feat: polish cobalt ledger interaction surfaces"
```

## Task 5: Verify the redesign, inspect state coverage, and prepare release

**Files:**
- Modify if required by verification only: files from Tasks 1–4
- Modify: `docs/superpowers/specs/2026-09-16-fooder-cobalt-ledger-design.md` only if an approved implementation decision differs from the spec

**Interfaces:**
- Consumes: the completed UI and all existing API contracts.
- Produces: fresh evidence that the frontend and unchanged backend contracts pass, plus a final focused commit containing any verification-only correction.

- [ ] **Step 1: Run the full frontend test suite**

Run: `npm run test --prefix frontend`

Expected: PASS with no failed test files.

- [ ] **Step 2: Run production checks**

Run:

```bash
npx tsc --noEmit -p frontend/tsconfig.app.json
npm run build --prefix frontend
npm run lint --prefix frontend
```

Expected: Typecheck and build exit 0. Record lint warnings separately; fix all lint errors introduced by this work.

- [ ] **Step 3: Run unchanged backend contract tests**

Run: `npm run test --prefix backend`

Expected: PASS, demonstrating the UI did not require backend contract changes.

- [ ] **Step 4: Perform manual responsive and accessibility inspection**

At 320px and 640px+ widths, inspect: selected-shop line, opening/closing shop selector, create-shop error, search/no results, all three sort choices, rows with long Hebrew names and metadata, completion/Undo, completed restore, action/delete confirmation, add/edit sheet with chosen image, failed save, and toast/Add-control separation. In each overlay, test Escape and focus return. Enable reduced motion and increased contrast; confirm normal surfaces contain no green.

- [ ] **Step 5: Check the final change set and commit any verification corrections**

Run: `git diff --check && git status --short`

If a correction is required, write a focused regression test first, rerun the affected test, then commit it:

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/index.css frontend/src/components/ProfileSwitcher.tsx frontend/src/components/ProfileSwitcher.test.tsx frontend/src/components/ShopSelector.tsx frontend/src/components/ShopSelector.test.tsx frontend/src/components/ShopTabs.tsx frontend/src/components/ShopTabs.test.tsx frontend/src/components/ListToolbar.tsx frontend/src/components/ListToolbar.test.tsx frontend/src/components/ItemCard.tsx frontend/src/components/ShoppingList.tsx frontend/src/components/ShoppingList.test.tsx frontend/src/components/CompletedItems.tsx frontend/src/components/AddItemSheet.tsx frontend/src/components/AddItemSheet.test.tsx frontend/src/components/ItemActionsMenu.tsx frontend/src/components/ItemActionsMenu.test.tsx frontend/src/components/Toast.tsx
git commit -m "fix: resolve cobalt ledger review findings"
```

- [ ] **Step 6: Push the verified main branch**

Run: `git push origin main`

Expected: the remote reports the current main commit as pushed; then check Vercel’s deployment status and Render’s backend health endpoint as documented in `README.md`.
