import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { OcrConfig } from "../OcrConfig";

const props = {
  docPath: "/documents/scan.pdf",
  filename: "scan.pdf",
  onRun: vi.fn(),
};

test("offers a chip per verified language, with English preselected", () => {
  render(<OcrConfig {...props} onRun={vi.fn()} runSignal={0} />);
  expect(screen.getByRole("button", { name: "eng" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "deu" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("mounting with a runSignal does not fire onRun", () => {
  const onRun = vi.fn();
  render(<OcrConfig {...props} onRun={onRun} runSignal={3} />);
  expect(onRun).not.toHaveBeenCalled();
});

test("incrementing runSignal emits the current configuration", () => {
  const onRun = vi.fn();
  const { rerender } = render(
    <OcrConfig {...props} onRun={onRun} runSignal={0} />,
  );
  rerender(<OcrConfig {...props} onRun={onRun} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith({
    docPath: "/documents/scan.pdf",
    filename: "scan.pdf",
    languages: ["eng"],
    tableDetection: true,
    outputFormat: "json",
  });
});

test("selecting a second language adds it to the request", () => {
  const onRun = vi.fn();
  const { rerender } = render(
    <OcrConfig {...props} onRun={onRun} runSignal={0} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "deu" }));
  rerender(<OcrConfig {...props} onRun={onRun} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith(
    expect.objectContaining({ languages: ["eng", "deu"] }),
  );
});

test("deselecting every language is allowed and falls back at the client", () => {
  // The client sends "eng" for an empty selection, so an empty picker must not
  // be blocked here — the fallback lives in one place, in extractOcr.
  const onRun = vi.fn();
  const { rerender } = render(
    <OcrConfig {...props} onRun={onRun} runSignal={0} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "eng" }));
  rerender(<OcrConfig {...props} onRun={onRun} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ languages: [] }));
});

test("table detection and output format are configurable", () => {
  const onRun = vi.fn();
  const { rerender } = render(
    <OcrConfig {...props} onRun={onRun} runSignal={0} />,
  );
  fireEvent.click(screen.getByLabelText("Detect tables"));
  fireEvent.click(screen.getByRole("button", { name: "Markdown" }));
  rerender(<OcrConfig {...props} onRun={onRun} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith(
    expect.objectContaining({ tableDetection: false, outputFormat: "markdown" }),
  );
});

test("initialLanguages seeds the chip selection", () => {
  // Multilingual OCR passes ["eng", "fra"] so the bilingual document it exists
  // for is already configured correctly on mount, without the user having to
  // click a second chip first.
  render(
    <OcrConfig
      {...props}
      onRun={vi.fn()}
      runSignal={0}
      initialLanguages={["eng", "fra"]}
    />,
  );
  expect(screen.getByRole("button", { name: "eng" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "fra" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "deu" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("omitting initialLanguages still defaults to English only", () => {
  // Adaptive OCR does not pass this prop at all — it depends on the default
  // staying ["eng"], not on some caller always supplying it.
  render(<OcrConfig {...props} onRun={vi.fn()} runSignal={0} />);
  expect(screen.getByRole("button", { name: "eng" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "fra" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("groups the language chips under an accessible name", () => {
  // Without this, a screen reader announces each chip only as "eng, button,
  // pressed", with no indication of what is being chosen — Field's own
  // <label> has no htmlFor target for a chip row, so it is not
  // programmatically associated with anything on its own.
  render(<OcrConfig {...props} onRun={vi.fn()} runSignal={0} />);
  const group = screen.getByRole("group", { name: "Languages" });
  expect(group).toContainElement(screen.getByRole("button", { name: "eng" }));
});

test("groups the format options under an accessible name", () => {
  render(<OcrConfig {...props} onRun={vi.fn()} runSignal={0} />);
  const group = screen.getByRole("group", { name: "Format" });
  expect(group).toContainElement(
    screen.getByRole("button", { name: "Markdown" }),
  );
});

test("offers no control for the verified no-op options", () => {
  // favor_accuracy, preprocessing, skew detection and the word-confidence
  // threshold were byte-identical on two documents on 2026-08-06. A control
  // that provably does nothing is the Multimodal toggle deleted the same day.
  render(<OcrConfig {...props} onRun={vi.fn()} runSignal={0} />);
  for (const label of [
    /favor accuracy/i,
    /preprocessing/i,
    /deskew/i,
    /skew/i,
    /word confidence/i,
  ]) {
    expect(screen.queryByText(label)).toBeNull();
  }
});
