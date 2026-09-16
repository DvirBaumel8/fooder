import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ItemActionsMenu } from "./ItemActionsMenu";

it("requires confirmation before deleting an item", async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn();

  render(<ItemActionsMenu itemName="חלב" onEdit={vi.fn()} onDelete={onDelete} />);

  await user.click(screen.getByRole("button", { name: "פעולות עבור חלב" }));
  await user.click(screen.getByRole("button", { name: "מחק" }));

  expect(screen.getByRole("alertdialog", { name: "מחיקת חלב" })).toBeVisible();
  expect(onDelete).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "מחק פריט" }));

  expect(onDelete).toHaveBeenCalledOnce();
});

it("keeps keyboard focus within the delete confirmation", async () => {
  const user = userEvent.setup();

  render(<ItemActionsMenu itemName="חלב" onEdit={vi.fn()} onDelete={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "פעולות עבור חלב" }));
  await user.click(screen.getByRole("button", { name: "מחק" }));

  const cancelButton = screen.getByRole("button", { name: "ביטול" });
  const deleteButton = screen.getByRole("button", { name: "מחק פריט" });
  expect(cancelButton).toHaveFocus();

  await user.tab();
  expect(deleteButton).toHaveFocus();
  await user.tab();
  expect(cancelButton).toHaveFocus();
  await user.tab({ shift: true });
  expect(deleteButton).toHaveFocus();
});

it("cancels deletion and restores trigger focus when Escape is pressed", async () => {
  const user = userEvent.setup();

  render(<ItemActionsMenu itemName="חלב" onEdit={vi.fn()} onDelete={vi.fn()} />);

  const trigger = screen.getByRole("button", { name: "פעולות עבור חלב" });
  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "מחק" }));
  await user.keyboard("{Escape}");

  expect(screen.queryByRole("alertdialog", { name: "מחיקת חלב" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("opens a labelled actions popup whose commands are reachable with Tab", async () => {
  const user = userEvent.setup();

  render(<ItemActionsMenu itemName="חלב" onEdit={vi.fn()} onDelete={vi.fn()} />);

  const trigger = screen.getByRole("button", { name: "פעולות עבור חלב" });
  await user.click(trigger);

  expect(screen.getByRole("group", { name: "פעולות עבור חלב" })).toBeVisible();
  await user.tab();
  expect(screen.getByRole("button", { name: "עריכה" })).toHaveFocus();
});
