import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { ShoppingListItem } from "../api/types";
import { ShoppingList } from "./ShoppingList";
import { CompletedItems } from "./CompletedItems";
import { Toast } from "./Toast";

const milkItem: ShoppingListItem = {
  id: "item-1",
  quantity: "2",
  note: "ללא לקטוז",
  createdAt: "2026-09-16T10:00:00.000Z",
  product: { id: "product-1", name: "חלב", category: "מוצרי חלב", photoUrl: null },
  shop: { id: "shop-1", name: "הסופר שלי" },
};

const eggsItem: ShoppingListItem = {
  id: "item-2",
  quantity: null,
  note: null,
  createdAt: "2026-09-15T10:00:00.000Z",
  product: { id: "product-2", name: "ביצים", category: "מוצרי חלב", photoUrl: null },
  shop: { id: "shop-1", name: "הסופר שלי" },
};

describe("ShoppingList", () => {
  it("shows a useful no-results state for a filtered list", () => {
    render(
      <ShoppingList
        items={[milkItem]}
        query="פסטה"
        sort="newest"
        onComplete={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("לא נמצאו פריטים")).toBeVisible();
    expect(screen.getByText("חפשו מונח אחר או הוסיפו פריט חדש.")).toBeVisible();
  });

  it("shows a distinct empty state for a shop with no items at all", () => {
    render(
      <ShoppingList items={[]} query="" sort="newest" onComplete={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByText("אין פריטים ברשימה")).toBeVisible();
    expect(screen.queryByText("לא נמצאו פריטים")).not.toBeInTheDocument();
  });

  it("renders filtered and sorted items and wires row actions", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ShoppingList
        items={[milkItem, eggsItem]}
        query="מוצרי חלב"
        sort="name"
        onComplete={onComplete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const names = screen.getAllByText(/^(חלב|ביצים)$/).map((node) => node.textContent);
    expect(names).toEqual(["ביצים", "חלב"]);

    await user.click(screen.getByRole("button", { name: "סמן את חלב כנקנה" }));
    expect(onComplete).toHaveBeenCalledWith("item-1");
  });
});

describe("CompletedItems", () => {
  it("keeps completed items collapsed until expanded", async () => {
    const user = userEvent.setup();
    render(<CompletedItems items={[milkItem]} onRestore={vi.fn()} />);

    expect(screen.queryByText("חלב")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "פריטים שנקנו (1)" }));
    expect(screen.getByText("חלב")).toBeVisible();
  });

  it("restores a completed item from the expanded list", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    render(<CompletedItems items={[milkItem]} onRestore={onRestore} />);

    await user.click(screen.getByRole("button", { name: "פריטים שנקנו (1)" }));
    await user.click(screen.getByRole("button", { name: /שחזור.*חלב/ }));

    expect(onRestore).toHaveBeenCalledWith(milkItem);
  });

  it("renders nothing when there is no completion history", () => {
    render(<CompletedItems items={[]} onRestore={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /פריטים שנקנו/ })).not.toBeInTheDocument();
  });
});

describe("Toast", () => {
  it("shows the message and triggers the undo action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onDismiss = vi.fn();

    render(<Toast message="סומן כנקנה" actionLabel="בטל" onAction={onAction} onDismiss={onDismiss} />);

    expect(screen.getByText("סומן כנקנה")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "בטל" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("renders without an action button when none is provided", () => {
    render(<Toast message="הפריט נמחק" onDismiss={vi.fn()} />);
    expect(screen.getByText("הפריט נמחק")).toBeVisible();
    expect(screen.queryByRole("button", { name: "בטל" })).not.toBeInTheDocument();
  });

  it("auto-dismisses after a delay", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="סומן כנקנה" onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(onDismiss).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("gives a second toast with the same message its own full timer instead of inheriting the first toast's remaining time", () => {
    // Regression test for finding #2: App renders <Toast key={toast.id} .../>, so a
    // second "סומן כנקנה" toast (from completing another item) mounts as a fresh
    // instance rather than reusing the first one's in-flight timer.
    vi.useFakeTimers();
    const onDismissFirst = vi.fn();
    const onDismissSecond = vi.fn();

    const { rerender } = render(
      <Toast key="toast-1" message="סומן כנקנה" onDismiss={onDismissFirst} />
    );

    vi.advanceTimersByTime(3000);
    rerender(<Toast key="toast-2" message="סומן כנקנה" onDismiss={onDismissSecond} />);

    // Only 3s have elapsed since the second toast mounted (4s total including the
    // first toast's head start) - it must still be showing.
    vi.advanceTimersByTime(3000);
    expect(onDismissSecond).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onDismissSecond).toHaveBeenCalledOnce();
    expect(onDismissFirst).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
