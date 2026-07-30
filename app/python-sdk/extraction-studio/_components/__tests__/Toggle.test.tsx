import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Toggle } from "../Toggle";

test("renders the description when given", () => {
  render(
    <Toggle
      checked={false}
      onChange={() => {}}
      label="Strict schema"
      description="Provider-enforced structured output."
    />,
  );
  expect(
    screen.getByText("Provider-enforced structured output."),
  ).toBeInTheDocument();
});

test("still works without a description and reports the flip", () => {
  const onChange = vi.fn();
  render(
    <Toggle checked={false} onChange={onChange} label="Include citations" />,
  );
  const sw = screen.getByRole("switch", { name: "Include citations" });
  expect(sw).toHaveAttribute("aria-checked", "false");
  fireEvent.click(sw);
  expect(onChange).toHaveBeenCalledWith(true);
});
