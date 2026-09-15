# Fooder UI Redesign and Shop Expansion

## Goal

Make Fooder feel like a calm, useful shared shopping companion for Dvir and מאי, while adding ניצת הדובדבן as a persistent shop.

## Product behavior

- The app remains RTL and mobile-first.
- The profile name is מאי everywhere in the UI and persisted local profile selection.
- The active shop is visually prominent and easy to switch between without cramped pills.
- The current shop shows a clear count of items still to buy and a friendly empty state.
- Items are grouped into active and recently completed sections so completing an item gives visible feedback without losing context.
- Adding an item is the primary action. The add flow supports search, selecting an existing product, creating a new product, quantity, note, and optional photo without exposing a visually noisy form by default.
- Existing real-time updates, product photos, API contracts, and profile switching remain intact.
- ניצת הדובדבן is created by an idempotent backend seed/startup path so existing deployments do not receive duplicates.

## Visual direction

- Warm cream background, dark ink text, and a restrained green accent associated with groceries.
- Large rounded surfaces, generous spacing, clear type scale, subtle borders, and minimal shadows.
- Shop selector uses a horizontal, touch-friendly card/tab treatment with the add-shop action separated from the shop choices.
- Item cards emphasize the product name and quantity, with completion as the dominant affordance and destructive deletion visually secondary.
- Loading, error, and empty states are designed components rather than plain paragraphs.

## Technical approach

- Keep the current React/TanStack Query structure and API endpoints.
- Refactor `App`, `ShopTabs`, `AddItemSheet`, and `ItemCard` around small presentational regions and shared class styles in `index.css`.
- Update the profile union/default from מיי to מאי.
- Add the new shop through an idempotent backend initialization/seed path and cover it with a backend test.
- Do not introduce a component library or a new routing/state architecture for this pass.

## Verification

- Run the backend test suite and frontend typecheck/build.
- Verify the new shop is returned once by the shops endpoint and that existing shops remain unchanged.
- Open the deployed frontend and check the RTL layout, profile label, shop selector, add flow, completion flow, and empty state at a narrow viewport.
