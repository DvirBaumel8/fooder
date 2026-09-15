# Fooder Serious UI Upgrade

## Goal

Rebuild Fooder’s frontend as a calm, capable mobile shopping tool. The experience must prioritize getting items into, through, and out of a shared list quickly. It remains Hebrew/RTL-first and works equally well on narrow phones and larger screens.

The redesign replaces the current playful, decorative visual language with a premium grocery/productivity system: compact information, intentional hierarchy, clear actions, and minimal decoration.

## Research and audit

The current interface uses large rounded surfaces, warm cream/olive tones, emoji, dotted outlines, and a grid of shop pills. Together these visually compete with the actual shopping list. The add sheet exposes several choices without clear priority, and the main view has no fast way to find, organize, or manage many items.

The redesign follows these research-backed principles:

- Keep search in a primary, clearly scoped location; it filters the current shop’s active list.
- Use dense, aligned rows to make products easy to scan.
- Show one prominent primary action and move secondary/destructive actions into progressive disclosure.
- Give each screen a predictable title, action area, and list state.
- Preserve touch-friendly targets and visible keyboard focus states.

Sources: [Apple HIG — Searching](https://developer.apple.com/design/human-interface-guidelines/searching), [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout), and [Baymard mobile product-list research](https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/product-list).

## Product scope

### Included in this frontend upgrade

- A modern app shell, item-list experience, search, and client-side sorting.
- A compact shop switcher and frontend-ready shop management entry point.
- Item CRUD UI using the existing list APIs: create, edit, complete/restore, and delete.
- Product search and image upload using existing APIs.
- Well-structured empty, loading, error, and mutation-feedback states.
- RTL, keyboard, screen-reader, and mobile-safe interaction improvements.

### Backend-owned follow-up APIs

The frontend will only expose destructive or editable entity controls once their APIs exist:

- Shop rename and delete.
- Product rename, category updates, and delete.
- Server-side list search/filter/sort when lists become large or shared data needs canonical ordering.

The frontend types and UI boundaries will make those operations additive, without mocks or invented endpoints.

## Visual system

- **Color:** cool off-white application background; white elevated surfaces; charcoal text; muted slate borders and secondary text; forest green for the primary action and completed state; red only for destructive confirmation.
- **Type:** system UI/Noto Sans Hebrew with a disciplined scale: app title, section heading, product name, and metadata. Avoid all-caps visual noise and decorative letter spacing for Hebrew text.
- **Surfaces:** restrained 12–16px radii, fine borders, and only subtle elevation where a surface must separate from the page. Remove dashed borders from normal interaction surfaces.
- **Icons:** use one consistent icon set for search, sort, add, edit, more actions, camera, check, and delete. Emoji are not part of the functional UI.
- **Motion:** short, functional transitions for sheets, row completion, and toasts. Respect reduced-motion preferences.

## Information architecture

### Main list

1. Compact header: active household/profile context and a small account switcher.
2. Horizontal shop switcher: selected shop, overflow/manage entry, and a small add-shop affordance only when supported.
3. List toolbar: searchable input labeled for the active shop; a sort button that opens a simple menu.
4. Active list: a count and compact product rows.
5. Completed list: collapsed by default; expands to show recent completions and supports restore.
6. Floating or bottom-anchored primary “add item” action that stays above the mobile safe area.

Search filters locally by product name, quantity, note, and category. Sort choices are: newest (default), name, and category. Sorting is local and clearly labeled; it does not alter shared server ordering.

### Item row

Each row has:

- 44–48px image or neutral initial placeholder.
- Product name as the scan anchor.
- Quantity/category and note as succinct secondary text.
- A large completion target.
- A single overflow trigger containing edit and delete. Delete requires confirmation.

Selecting the row or Edit opens the item sheet. The row never contains multiple equally prominent text buttons.

### Add and edit sheet

The sheet uses the same component in create and edit modes.

- Product search/name is first and autofocuses only in create mode.
- Suggestions appear directly below search and retain product photos where available.
- Quantity, note, and photo sit in a compact optional-details section.
- Edit mode displays a read-only product identity until product-edit APIs are available; it supports quantity, note, and photo replacement.
- Save is the sticky primary action. Cancel/close never competes with save visually.
- A failed save remains in the sheet, preserves form state, and provides a retry message.

### Entity management boundary

Shop and product management open from a clear overflow/navigation point. The initial frontend state can show available management actions only when the corresponding capability is supplied by the API. This prevents presenting nonfunctional CRUD controls.

## State, feedback, and accessibility

- Use optimistic visual feedback only for reversible completion; invalidate React Query data after every successful mutation.
- Show a lightweight success toast with Undo after completing an item.
- Keep create/edit sheets open after errors and expose an error message near the action.
- Confirm destructive deletion in a modal or action sheet that names the affected entity.
- All icon-only buttons have Hebrew accessible names. Focus moves into an opened sheet and returns to its trigger on close. Sheets can be dismissed with Escape and backdrop tap where safe.
- All controls meet a 44px touch target minimum; color is never the only state indicator.

## Component boundaries

- `App`: fetches data and owns active shop, search, sort, and sheet state.
- `ListToolbar`: search and sort selection; receives pure state and callbacks.
- `ShopSwitcher`: display and select shops; exposes optional management capability.
- `ShoppingList`: applies filtering/sorting and renders list states.
- `ItemRow`: display, completion, and overflow trigger only.
- `ItemActionsMenu`: edit/delete commands and deletion confirmation handoff.
- `ItemSheet`: create/edit form plus image upload, with preserved form state on error.
- `CompletedItems`: collapsible recent completions and restore.
- `Toast`: unobtrusive mutation feedback.

This decomposition removes layout decisions from `App` and keeps future entity-management APIs from leaking into list presentation.

## Data contracts

Existing endpoints remain the source of truth for this phase:

- `GET /api/list`, `POST /api/list`, `PATCH /api/list/:id`, `POST /api/list/:id/complete`, and `DELETE /api/list/:id`.
- `GET /api/products` and `POST /api/products/:id/photo`.
- Existing shop read/create endpoints.

When backend CRUD endpoints are introduced, frontend capability flags or typed hooks will determine which management controls render. No request will be sent to an endpoint that is not implemented.

## Verification

- Unit-test filtering and sorting behaviour, including Hebrew product names and empty results.
- Component-test list toolbar, item actions, deletion confirmation, create/edit sheets, and error preservation.
- Run backend tests to ensure unchanged existing contracts remain valid.
- Run frontend typecheck/build and lint.
- Perform narrow mobile and desktop visual QA: RTL alignment, safe-area spacing, keyboard/sheet behaviour, text truncation, long lists, empty states, and error paths.

## Success criteria

- A first-time user can understand the active shop, search its list, add an item, complete it, edit it, and delete it without explanation.
- The mobile screen leads with the list and task controls, not decoration.
- All current item functionality remains available, but secondary operations do not clutter every row.
- The UI can accept shop and product CRUD APIs later without a structural rewrite.
