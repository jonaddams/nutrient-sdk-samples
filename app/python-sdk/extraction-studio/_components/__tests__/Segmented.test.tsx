import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, test, vi } from "vitest";
import { Segmented } from "../Segmented";

test("Segmented fires onChange with selected value", () => {
  const onChange = vi.fn();
  render(
    <Segmented
      label="Panel"
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

describe("Segmented", () => {
  it("names its group, so a screen reader does not meet an anonymous role=group", () => {
    render(
      <Segmented
        label="View"
        options={[
          { label: "Table", value: "table" },
          { label: "CSV", value: "csv" },
        ]}
        value="table"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("group", { name: "View" })).toBeInTheDocument();
  });

  it("marks only the active option as pressed", () => {
    render(
      <Segmented
        label="View"
        options={[
          { label: "Table", value: "table" },
          { label: "CSV", value: "csv" },
        ]}
        value="csv"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Table" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "CSV" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("hands the clicked value back", () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="View"
        options={[
          { label: "Table", value: "table" },
          { label: "CSV", value: "csv" },
        ]}
        value="table"
        onChange={onChange}
      />,
    );
    screen.getByRole("button", { name: "CSV" }).click();
    expect(onChange).toHaveBeenCalledWith("csv");
  });
});
