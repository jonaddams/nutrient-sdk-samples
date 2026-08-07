import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { CITATION_PRESETS } from "../../lib/citations";
import { HighlightColor } from "../HighlightColor";

const AMBER = "#ffc107";
const CYAN = "#00a3e0";

test("renders a swatch per preset plus the native picker", () => {
  render(
    <HighlightColor label="Citation color" value={AMBER} onChange={() => {}} />,
  );
  for (const p of CITATION_PRESETS) {
    expect(screen.getByRole("button", { name: p.label })).toBeInTheDocument();
  }
  expect(
    screen.getByLabelText("Pick a custom citation color"),
  ).toBeInTheDocument();
});

test("the picker is a real colour input, not a stand-in button", () => {
  // The dropper icon is chrome over a live <input type="color">. Replacing it
  // with a click handler would lose the OS picker and system eyedropper.
  render(
    <HighlightColor label="Citation color" value={AMBER} onChange={() => {}} />,
  );
  const input = screen.getByLabelText("Pick a custom citation color");
  expect(input.tagName).toBe("INPUT");
  expect(input).toHaveAttribute("type", "color");
});

test("the picker shows an icon rather than a fifth colour swatch", () => {
  // A coloured square beside four preset squares reads as another preset. The
  // regression this guards is someone tinting the BUTTON with the current
  // value — the corner dot below is the sanctioned way to show the colour.
  const { container } = render(
    <HighlightColor label="Citation color" value={AMBER} onChange={() => {}} />,
  );
  const picker = container.querySelector<HTMLElement>(".citation-picker");
  expect(picker).not.toBeNull();
  expect(picker?.querySelector("svg")).not.toBeNull();
  // decorative: the input carries the accessible name, so the icon must not
  expect(picker?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  // the button itself stays untinted
  expect(picker?.style.background).toBe("");
});

test("a corner dot displays the current colour, including a custom one", () => {
  // Why this exists: a hand-picked colour used to appear nowhere but the hex
  // field, because the picker button refuses to tint itself. The dot is the
  // compromise — it shows the value without turning the control into a swatch.
  const { container, rerender } = render(
    <HighlightColor label="Citation color" value={AMBER} onChange={() => {}} />,
  );
  const dot = () => container.querySelector<HTMLElement>(".citation-dot");
  expect(dot()).not.toBeNull();
  expect(dot()).toHaveStyle({ background: AMBER });
  // decorative — the hex field already names the value for screen readers
  expect(dot()).toHaveAttribute("aria-hidden", "true");

  // The case the item was raised for: a colour matching no preset.
  rerender(
    <HighlightColor
      label="Citation color"
      value="#123456"
      onChange={() => {}}
    />,
  );
  expect(dot()).toHaveStyle({ background: "#123456" });
});

test("the dot lives inside the picker, so it cannot steal the click", () => {
  // The invisible <input type="color"> covers the button and must keep
  // receiving the click. The dot is a child of the same label (and
  // pointer-events: none in CSS), not a sibling laid over it.
  const { container } = render(
    <HighlightColor label="Citation color" value={CYAN} onChange={() => {}} />,
  );
  const picker = container.querySelector(".citation-picker");
  expect(picker?.querySelector(".citation-dot")).not.toBeNull();
  expect(picker?.querySelector('input[type="color"]')).not.toBeNull();
});

test("marks the picker as custom only when no preset matches", () => {
  const { container, rerender } = render(
    <HighlightColor label="Citation color" value={AMBER} onChange={() => {}} />,
  );
  const picker = () => container.querySelector(".citation-picker");
  expect(picker()).not.toHaveAttribute("data-custom");
  rerender(
    <HighlightColor
      label="Citation color"
      value="#123456"
      onChange={() => {}}
    />,
  );
  expect(picker()).toHaveAttribute("data-custom", "true");
});

test("marks the swatch matching the current value", () => {
  render(
    <HighlightColor label="Citation color" value={CYAN} onChange={() => {}} />,
  );
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
  render(
    <HighlightColor
      label="Citation color"
      value={CYAN.toUpperCase()}
      onChange={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: "Cyan" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("reports the preset that was clicked", () => {
  const onChange = vi.fn();
  render(
    <HighlightColor label="Citation color" value={AMBER} onChange={onChange} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cyan" }));
  expect(onChange).toHaveBeenCalledWith(CYAN);
});

test("commits a valid hex typed into the text field", () => {
  const onChange = vi.fn();
  render(
    <HighlightColor label="Citation color" value={AMBER} onChange={onChange} />,
  );
  fireEvent.change(screen.getByLabelText("Citation color hex value"), {
    target: { value: "#123456" },
  });
  expect(onChange).toHaveBeenCalledWith("#123456");
});

test("normalises shorthand and bare hex before committing", () => {
  const onChange = vi.fn();
  render(
    <HighlightColor label="Citation color" value={AMBER} onChange={onChange} />,
  );
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
  render(
    <HighlightColor label="Citation color" value={AMBER} onChange={onChange} />,
  );
  const field = screen.getByLabelText("Citation color hex value");
  for (const partial of ["#", "#f", "#ff", "#fff0"]) {
    fireEvent.change(field, { target: { value: partial } });
  }
  expect(onChange).not.toHaveBeenCalled();
  // and the draft is preserved so it can be finished
  expect(field).toHaveValue("#fff0");
});

test("reverts the draft on blur when it never became valid", () => {
  render(
    <HighlightColor label="Citation color" value={AMBER} onChange={() => {}} />,
  );
  const field = screen.getByLabelText("Citation color hex value");
  fireEvent.change(field, { target: { value: "nope" } });
  fireEvent.blur(field);
  expect(field).toHaveValue(AMBER);
});

test("follows an externally changed value", () => {
  const { rerender } = render(
    <HighlightColor label="Citation color" value={AMBER} onChange={() => {}} />,
  );
  rerender(
    <HighlightColor label="Citation color" value={CYAN} onChange={() => {}} />,
  );
  expect(screen.getByLabelText("Citation color hex value")).toHaveValue(CYAN);
});

test("the label names the control and reaches both aria-labels", () => {
  // One component, two panels: structured calls these citations, OCR calls
  // them regions. A screen reader must hear the right noun in each.
  render(
    <HighlightColor label="Region color" value={AMBER} onChange={() => {}} />,
  );
  expect(screen.getByText("Region color")).toBeInTheDocument();
  expect(
    screen.getByLabelText("Pick a custom region color"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Region color hex value")).toBeInTheDocument();
});

test("embedded drops both the visible label and the wrapper, but keeps the aria-labels", () => {
  // embedded means "I am inside a parent's .citation-color block already" —
  // the parent supplies its own label and the shared block padding. A second
  // nested .citation-color here would double that padding, since the CSS
  // rule matches the class regardless of nesting depth.
  const { container } = render(
    <HighlightColor
      label="Region color"
      embedded
      value={AMBER}
      onChange={() => {}}
    />,
  );
  expect(screen.queryByText("Region color")).not.toBeInTheDocument();
  expect(container.querySelector(".citation-color")).not.toBeInTheDocument();
  expect(
    screen.getByLabelText("Pick a custom region color"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Region color hex value")).toBeInTheDocument();
});
