import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Segmented } from "../Segmented";

test("Segmented fires onChange with selected value", () => {
  const onChange = vi.fn();
  render(
    <Segmented
      options={[
        { label: "Configuration", value: "config" },
        { label: "Results", value: "results" },
      ]}
      value="config"
      onChange={onChange}
    />,
  );
  fireEvent.click(screen.getByText("Results"));
  expect(onChange).toHaveBeenCalledWith("results");
});
