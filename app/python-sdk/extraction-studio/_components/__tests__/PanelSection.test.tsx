import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { PanelSection } from "../PanelSection";

test("renders the section title and its children", () => {
  render(
    <PanelSection title="Extraction rules">
      <p>inner</p>
    </PanelSection>,
  );
  expect(screen.getByText("Extraction rules")).toBeInTheDocument();
  expect(screen.getByText("inner")).toBeInTheDocument();
});

test("exposes the title as a group label for assistive tech", () => {
  render(
    <PanelSection title="Advanced options">
      <p>inner</p>
    </PanelSection>,
  );
  expect(
    screen.getByRole("group", { name: "Advanced options" }),
  ).toBeInTheDocument();
});
