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

it("closes the profile menu and returns focus to the trigger when Escape is pressed", async () => {
  const user = userEvent.setup();
  render(<ProfileSwitcher profile="דביר" onChange={vi.fn()} />);

  const trigger = screen.getByRole("button", { name: "פרופיל: דביר" });
  await user.click(trigger);
  await user.tab();
  expect(screen.getByRole("menuitemradio", { name: "דביר" })).toHaveFocus();

  await user.keyboard("{Escape}");

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("closes the profile menu when the user taps outside it", async () => {
  const user = userEvent.setup();
  render(<ProfileSwitcher profile="דביר" onChange={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "פרופיל: דביר" }));
  expect(screen.getByRole("menu")).toBeVisible();

  await user.click(document.body);

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("marks the selected profile with semantics and a visible non-color cue", async () => {
  const user = userEvent.setup();
  render(<ProfileSwitcher profile="דביר" onChange={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "פרופיל: דביר" }));

  const selectedProfile = screen.getByRole("menuitemradio", { name: "דביר" });
  expect(selectedProfile).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("menuitemradio", { name: "מאי" })).toHaveAttribute("aria-checked", "false");
  expect(selectedProfile).toHaveTextContent("✓");
});
