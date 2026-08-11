import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import local from "../../lib/__tests__/fixtures/handwriting-local.json";
import vlm from "../../lib/__tests__/fixtures/handwriting-vlm.json";
import type { HandwritingResult } from "../../lib/handwriting";
import { HandwritingResults } from "../HandwritingResults";

const LOCAL = local as unknown as HandwritingResult;
const VLM = vlm as unknown as HandwritingResult;

function renderResults(result: HandwritingResult) {
  return render(
    <HandwritingResults
      result={result}
      activeIndex={null}
      onSelectElement={vi.fn()}
      showRegions={true}
      onShowRegionsChange={vi.fn()}
      colorMode="confidence"
      onColorModeChange={vi.fn()}
      citationHex="#4a6cf7"
      onCitationHexChange={vi.fn()}
    />,
  );
}

test("a local run shows average confidence and offers confidence colouring", () => {
  renderResults(LOCAL);
  expect(screen.getByText(/avg confidence/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "By confidence" })).toBeTruthy();
});

test("a VLM run hides the average confidence and says why", () => {
  // The scores come back byte-identical to the local pass while the text is
  // rewritten, so 86% next to a perfect transcription is a claim about a run
  // the reader cannot see.
  renderResults(VLM);
  expect(screen.queryByText(/avg confidence/)).toBeNull();
  expect(screen.getByText(/local recognition pass/)).toBeTruthy();
});

test("a VLM run offers no confidence colouring, only the colour picker", () => {
  renderResults(VLM);
  expect(screen.queryByRole("button", { name: "By confidence" })).toBeNull();
  // HighlightColor's accessible names derive from its `label` prop:
  // "Pick a custom region color" and "Region color hex value". Match the exact
  // one — a /region color/i regex matches both and getByLabelText throws.
  expect(screen.getByLabelText("Region color hex value")).toBeTruthy();
});

test("a VLM run's element table carries no per-element confidence", () => {
  renderResults(VLM);
  expect(screen.queryByRole("img", { name: /confidence/ })).toBeNull();
});

test("a local run's element table does carry per-element confidence", () => {
  renderResults(LOCAL);
  expect(
    screen.getAllByRole("img", { name: /confidence/ }).length,
  ).toBeGreaterThan(0);
});

test("the panel describes the run on screen, not the toggle's position", () => {
  // isVlmRun reads result.engine. Flipping the config toggle without re-running
  // must not change how the result already rendered is described.
  const { rerender } = renderResults(LOCAL);
  expect(screen.getByText(/avg confidence/)).toBeTruthy();
  rerender(
    <HandwritingResults
      result={VLM}
      activeIndex={null}
      onSelectElement={vi.fn()}
      showRegions={true}
      onShowRegionsChange={vi.fn()}
      colorMode="confidence"
      onColorModeChange={vi.fn()}
      citationHex="#4a6cf7"
      onCitationHexChange={vi.fn()}
    />,
  );
  expect(screen.queryByText(/avg confidence/)).toBeNull();
});

test("no text found is a named state, never a blank table", () => {
  renderResults({ ...LOCAL, textElements: [], fullText: "" });
  expect(screen.getByText(/No text found/)).toBeTruthy();
});

test("a backend without the code key still renders the Code view", () => {
  // `code` is optional so the frontend can deploy before the backend does. A
  // segment that vanishes based on state is the worse failure.
  renderResults({ ...LOCAL, code: undefined });
  expect(screen.getByRole("button", { name: "Code" })).toBeTruthy();
});
