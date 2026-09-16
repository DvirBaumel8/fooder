import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ProfileSwitcher } from "./ProfileSwitcher";

it("keeps profile choices out of the header until the compact account trigger opens", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<ProfileSwitcher profile="דביר" onChange={onChange} />);

  expect(screen.getByRole("button", { name: "פרופיל: דביר" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("menuitemradio", { name: "מאי" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "פרופיל: דביר" }));
  await user.click(screen.getByRole("menuitemradio", { name: "מאי" }));
  expect(onChange).toHaveBeenCalledWith("מאי");
});
