import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ItemActionsMenu } from "./ItemActionsMenu";

it("requires confirmation before deleting an item", async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn();

  render(<ItemActionsMenu itemName="חלב" onEdit={vi.fn()} onDelete={onDelete} />);

  await user.click(screen.getByRole("button", { name: "פעולות עבור חלב" }));
  await user.click(screen.getByRole("menuitem", { name: "מחק" }));

  expect(screen.getByRole("alertdialog", { name: "מחיקת חלב" })).toBeVisible();
  expect(onDelete).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "מחק פריט" }));

  expect(onDelete).toHaveBeenCalledOnce();
});
