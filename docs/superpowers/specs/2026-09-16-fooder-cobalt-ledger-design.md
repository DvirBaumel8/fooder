# Fooder Cobalt Ledger UI Redesign

## Status

Approved visual direction; ready for implementation planning after user review of this document.

## Goal

Replace the current card-heavy, green shopping workspace with **Cobalt Ledger**: a compact, contemporary, RTL-first mobile tool that makes the active shopping list feel like a calm working surface.

The redesign must look deliberately modern rather than like a themed grocery app. It favors precision, density, quiet hierarchy, and progressive disclosure over oversized rounded controls, decorative iconography, or large colored surfaces.

## User-approved visual direction

The approved mockup is the source for the design language:

- Warm near-white app canvas with white list surfaces.
- Charcoal foreground text and cool gray supporting text.
- A single cobalt accent (`#4169E1`) for the primary add action, the active/selected state, and small identity markers only.
- No green application surfaces or green status color. Destructive feedback remains red; completed rows communicate their state through icon, label, and strike-through rather than a new decorative color.
- Compact row density. Hit areas stay at least 44px even when the visible glyph, divider, or control is smaller.
- Hairline dividers, shallow 8–10px rounding on controls, and no floating card treatment for normal list rows.
- System/Noto Sans Hebrew typography with normal to medium weights. The hierarchy comes from spacing and scale, not excessive heavy bold text.

This applies Apple’s guidance to use color sparingly and consistently, not as the background of many peer controls. It also preserves sufficient text and icon contrast in light, dark, and increased-contrast modes.

## Scope

### Included

- Replace the current global green palette and rounded card system with Cobalt Ledger tokens.
- Restructure the main mobile workspace, shop selection, search/sort controls, item rows, completed-items section, empty/loading/error states, sheets, menus, and feedback components.
- Preserve existing item and shop behaviors: shop selection and creation, search, sort, add, edit, image upload, complete, undo/restore, and delete.
- Improve responsive and RTL composition at phone, tablet, and desktop widths.
- Retain keyboard, screen-reader, focus-return, safe-area, reduced-motion, and 44px touch-target behavior already covered by the current frontend tests.

### Not included

- New backend APIs or changes to shop/product CRUD contracts.
- Product taxonomy, image-processing, authentication, or a standalone design system package.
- Replacing existing data fetching or list mutation behavior.

## Visual tokens

Use semantic CSS variables so the light theme, future dark theme, and increased-contrast variants can be defined independently.

| Token | Light value | Purpose |
|---|---:|---|
| `--color-bg` | `#F8F8FA` | Page canvas |
| `--color-surface` | `#FFFFFF` | List and sheet surfaces |
| `--color-ink` | `#15161A` | Primary content |
| `--color-muted` | `#81838C` | Metadata and quiet controls |
| `--color-border` | `#EBECF0` | Hairline structure |
| `--color-primary` | `#4169E1` | Cobalt action/selection |
| `--color-primary-soft` | `#EDF1FF` | Subtle selected surface |
| `--color-danger` | `#B42318` | Destructive action/error |

The production implementation must define appropriate dark/high-contrast variants rather than hard-coding these values into individual components. Primary text and icons must meet at least WCAG AA contrast; the primary action’s white label must be checked against the final cobalt value.

## Screen structure

### Main workspace

The desktop remains a centered, narrow reading column. On a phone, content appears in this order:

1. **App header** — `Fooder`, a quiet personalized greeting, and one compact account/profile trigger. The header has no profile pill group.
2. **Shop line** — a full-width text-first row: small cobalt shop marker, selected shop name, and a low-emphasis “switch” affordance. It replaces the always-visible competition between many shop chips and an add-shop button.
3. **Search and sort** — a low-contrast search surface paired with an icon-only sort control. Both sit below the shop line and above the list.
4. **List heading** — a small "לקנות" heading with remaining count; the current shop name is not repeated as a large second page heading.
5. **Active items** — an uninterrupted vertical list with hairline separators.
6. **Completed section** — a collapsed text-first disclosure below active items.
7. **Add action** — a compact cobalt floating square/rounded control in the RTL trailing corner, fixed above the safe area. It has an explicit accessible name; a mobile-first visual label may appear via tooltip or an expanded state, but it is not a full-width footer bar.

There are no decorative empty-state stars, dashed outlines, emoji, broad colored count badges, or repeated elevated cards.

### Shop selection and creation

The main screen exposes only the selected shop. Tapping its shop line opens a controlled selection surface (sheet/menu appropriate to viewport) with:

- A selectable list of shops.
- A single secondary “add shop” command at the end.
- The current inline create-shop form, retaining its error message and focus behavior.

The shop switcher continues supporting keyboard selection and RTL arrow-key semantics. The implementation may retain the existing underlying tab semantics in a sheet, or move selection to a menu/listbox if that better matches the final interaction; tests must cover its keyboard behavior.

### Search and sort

Search remains scoped to the active shop and filters live by the existing fields. The input is visually soft, not a strong bordered field.

Sort is a 44px labelled-for-accessibility icon target. Its menu presents current choices (newest, name, category) with an icon/text selection indicator. It returns focus to its trigger when dismissed.

### Item row

Each active item is a 56px-or-greater visual row inside a single white list surface.

- On the logical start edge for RTL: circular completion target with a 44px touch area.
- Central scan anchor: product name; one optional, compact metadata line for quantity, category, or note.
- Product images are suppressed from the default row treatment. When a product photo is available, it remains useful in the edit/add flow and may be displayed only in a deliberately optional expanded detail treatment; it must never make every list row card-like.
- On the logical end edge: quiet ellipsis trigger, also with a 44px touch area, containing edit/delete.
- No framed icon buttons within ordinary rows. Hover/focus can add a subtle Cobalt Ledger tint without changing layout.

Completion is visibly confirmed with a check icon, completion/undo feedback, and movement into the completed section. Do not use cobalt or color alone to mean completed.

### Completed, empty, loading, and error states

Completed rows stay behind a compact divider/disclosure labeled “נקנה.” Expanded entries are plain, low-emphasis rows with a textual restore action.

Loading uses a small inline spinner and sentence, not a large boxed panel. Empty/search-empty states use a concise heading, sentence, and optional textual add action; no decorative icon tile. Recoverable loading errors use a narrow message and one cobalt retry button.

### Create/edit sheet

The item sheet adopts the same neutral/cobalt system:

- White surface with restrained radius, hairline boundaries, and a simple close control.
- Product identity/search first; product suggestions use rows with separators, not mini cards.
- Optional quantity, note, and image details remain a disclosure.
- Sticky cobalt save action with a quiet cancel/close action.
- Errors stay close to the failed action, preserve the entered state, and do not dismiss the sheet.

### Menus, dialog, and toast

Menus and confirmation dialogs use white surfaces, short shadows, and 8–10px radii. The action menu remains text-led with red reserved for delete. A destructive confirmation names the product.

The toast is a compact dark neutral message with a clearly readable Undo text action. Its position must remain above the floating add control and mobile safe area.

## Component plan

| Current boundary | Cobalt Ledger responsibility |
|---|---|
| `App` | Owns data/mutation state, selected shop, search/sort, and opens selection/add/edit surfaces. Drops layout-specific shop rail and large summary styling. |
| `ProfileSwitcher` | Becomes a compact account trigger, not a visually prominent green segmented pill. |
| `ShopTabs` | Evolves into `ShopSelector`/shop sheet: selected-shop line plus selection/create surface. Keeps controlled selection and accessible keyboard behavior. |
| `ListToolbar` | Renders soft search and quiet icon sort control/menu. |
| `ShoppingList` | Owns uninterrupted list/empty/search-empty rendering without boxed empty-state decoration. |
| `ItemCard` | Becomes a dense `ItemRow`; no normal card elevation or mandatory product thumbnail. |
| `ItemActionsMenu` | Keeps edit/delete behavior but moves visual emphasis to text menu actions. |
| `CompletedItems`, `Toast`, `AddItemSheet` | Adopt shared Ledger tokens and compact surfaces without changing their data interfaces. |
| `index.css` | Defines semantic palette, responsive spacing, appearance variants, interaction states, and all revised presentation rules. |

Renaming presentation components is allowed only if their test boundaries and imports are updated in the same task. API hooks and data contracts do not change.

## Interaction and accessibility requirements

- Hebrew/RTL is the default `dir` behavior. Logical CSS properties (`inline-start`, `inline-end`, etc.) are used instead of physical left/right except for fixed viewport centering where required.
- All apparent icon controls retain 44px targets, labelled accessible names, visible focus rings, and keyboard operation.
- The layout may look denser than its targets; hit areas may use transparent padding without visually enlarging controls.
- Shop selection, sort menu, action menu, create-shop form, add/edit sheet, and delete dialog all restore focus to their trigger when closed.
- Reduced-motion support remains active.
- Cobalt never becomes the only indicator for selection, completion, error, or focus.
- At narrow widths, text truncates cleanly before controls collide. At wider widths, list reading width remains bounded rather than becoming a dashboard.

## Verification

- Update affected component tests for the new roles, labels, and surface structure.
- Keep and extend keyboard/focus regression tests for profile selection, shop selection, sort, actions, dialogs, sheets, and toast/undo.
- Test filtering/sorting with Hebrew input and selected-shop changes.
- Run frontend tests, production build, typecheck, and lint; run backend tests to confirm unchanged contracts.
- Manually verify 320px mobile and 640px+ layouts in LTR/RTL-sensitive controls, plus dark/increased-contrast styles if introduced in this pass.
- Inspect active, empty, no-search-result, loading, error, completed-expanded, add, edit, image-upload, and destructive-confirmation states.

## Acceptance criteria

- The first screen reads as a modern, text-first list—not a grid of colored controls or a stack of cards.
- Green is absent from normal Fooder UI surfaces and controls.
- The active shop is clear without filling the screen with shop chips.
- Search, sort, complete, edit, delete, image upload, and shop creation continue to work.
- The default item list is visually dense and scan-friendly, with secondary actions quiet until needed.
- The result remains fully usable by touch, keyboard, screen reader, and RTL users.
