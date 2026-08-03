import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { CITATION_PRESETS } from "../../lib/citations";
import { CitationColor } from "../CitationColor";

const AMBER = "#ffc107";
const CYAN = "#00a3e0";

test("renders a swatch per preset plus the native picker", () => {
  render(<CitationColor value={AMBER} onChange={() => {}} />);
  for (const p of CITATION_PRESETS) {
    expect(screen.getByRole("button", { name: p.label })).toBeInTheDocument();
  }
  expect(
    screen.getByLabelText("Pick a custom citation color"),
  ).toBeInTheDocument();
});

test("marks the swatch matching the current value", () => {
  render(<CitationColor value={CYAN} onChange={() => {}} />);
  expect(screen.getByRole("button", { name: "Cyan" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Amber" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("matches the preset case-insensitively", () => {
  // A value round-tripped through the native input can come back uppercase.
  render(<CitationColor value={CYAN.toUpperCase()} onChange={() => {}} />);
  expect(screen.getByRole("button", { name: "Cyan" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("reports the preset that was clicked", () => {
  const onChange = vi.fn();
  render(<CitationColor value={AMBER} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Cyan" }));
  expect(onChange).toHaveBeenCalledWith(CYAN);
});

test("commits a valid hex typed into the text field", () => {
  const onChange = vi.fn();
  render(<CitationColor value={AMBER} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("Citation color hex value"), {
    target: { value: "#123456" },
  });
  expect(onChange).toHaveBeenCalledWith("#123456");
});

test("normalises shorthand and bare hex before committing", () => {
  const onChange = vi.fn();
  render(<CitationColor value={AMBER} onChange={onChange} />);
  const field = screen.getByLabelText("Citation color hex value");
  fireEvent.change(field, { target: { value: "#fff" } });
  expect(onChange).toHaveBeenLastCalledWith("#ffffff");
  fireEvent.change(field, { target: { value: "00a3e0" } });
  expect(onChange).toHaveBeenLastCalledWith(CYAN);
});

test("does NOT commit half-typed input", () => {
  // The annotation layer only ever receives a paintable colour, so partial
  // input must be held in the field rather than pushed to the canvas.
  const onChange = vi.fn();
  render(<CitationColor value={AMBER} onChange={onChange} />);
  const field = screen.getByLabelText("Citation color hex value");
  for (const partial of ["#", "#f", "#ff", "#fff0"]) {
    fireEvent.change(field, { target: { value: partial } });
  }
  expect(onChange).not.toHaveBeenCalled();
  // and the draft is preserved so it can be finished
  expect(field).toHaveValue("#fff0");
});

test("reverts the draft on blur when it never became valid", () => {
  render(<CitationColor value={AMBER} onChange={() => {}} />);
  const field = screen.getByLabelText("Citation color hex value");
  fireEvent.change(field, { target: { value: "nope" } });
  fireEvent.blur(field);
  expect(field).toHaveValue(AMBER);
});

test("follows an externally changed value", () => {
  const { rerender } = render(
    <CitationColor value={AMBER} onChange={() => {}} />,
  );
  rerender(<CitationColor value={CYAN} onChange={() => {}} />);
  expect(screen.getByLabelText("Citation color hex value")).toHaveValue(CYAN);
});
