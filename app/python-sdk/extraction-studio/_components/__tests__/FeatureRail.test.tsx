import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { FEATURES, FeatureRail } from "../FeatureRail";

test("rail lists features and selects an enabled one", () => {
  const onSelect = vi.fn();
  render(
    <FeatureRail features={FEATURES} value="structured" onSelect={onSelect} />,
  );
  expect(screen.getByText("Structured extraction")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Structured extraction"));
  expect(onSelect).toHaveBeenCalledWith("structured");
});
