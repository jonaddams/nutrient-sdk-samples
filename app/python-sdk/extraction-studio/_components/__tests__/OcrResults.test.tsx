import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { OcrResult } from "../../lib/ocr";
import { confidenceTone, OcrResults } from "../OcrResults";

const RESULT: OcrResult = {
  engine: "ADAPTIVE_OCR",
  filename: "scan.pdf",
  statistics: {
    totalElements: 2,
    textElements: 2,
    averageConfidence: 0.9,
    lowConfidenceElements: 1,
  },
  fullText: "[0] Invoice\n[1] Total",
  textElements: [
    {
      readingOrder: 0,
      type: "paragraph",
      text: "Invoice",
      confidence: 0.95,
      page: 0,
      citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 },
    },
    {
      readingOrder: 1,
      type: "paragraph",
      text: "Total",
      confidence: 0.32,
      page: 0,
      citation: { page: 0, x0: 0.3, y0: 0.3, x1: 0.4, y1: 0.4 },
    },
  ],
  pages: [{ page: 1, width: 1654, height: 2338 }],
  config: { languages: "eng", outputFormat: "json", tableDetection: true },
  timingMs: 812,
};

const props = {
  result: RESULT,
  activeIndex: null,
  onSelectElement: vi.fn(),
  showRegions: true,
  onShowRegionsChange: vi.fn(),
};

test("confidenceTone bands a score into three tones", () => {
  expect(confidenceTone(0.95)).toBe("good");
  expect(confidenceTone(0.6)).toBe("partial");
  expect(confidenceTone(0.2)).toBe("bad");
});

test("shows timing, element count and average confidence", () => {
  render(<OcrResults {...props} />);
  expect(screen.getByText("0.8s")).toBeInTheDocument();
  expect(screen.getByText(/2 elements/)).toBeInTheDocument();
  expect(screen.getByText(/90%/)).toBeInTheDocument();
});

test("lists every element with its confidence", () => {
  render(<OcrResults {...props} />);
  expect(screen.getByText("Invoice")).toBeInTheDocument();
  expect(screen.getByText("Total")).toBeInTheDocument();
  expect(screen.getByText("95%")).toBeInTheDocument();
  expect(screen.getByText("32%")).toBeInTheDocument();
});

test("clicking an element selects it", () => {
  const onSelectElement = vi.fn();
  render(<OcrResults {...props} onSelectElement={onSelectElement} />);
  fireEvent.click(screen.getByText("Total"));
  expect(onSelectElement).toHaveBeenCalledWith(1);
});

test("switches to the text view", () => {
  render(<OcrResults {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Text" }));
  expect(screen.getByText(/\[0\] Invoice/)).toBeInTheDocument();
});

test("names an empty result instead of showing a blank table", () => {
  // Silent emptiness is this feature's characteristic failure — a malformed
  // language string returns zero elements with no error — so the UI says so.
  render(
    <OcrResults
      {...props}
      result={{
        ...RESULT,
        textElements: [],
        statistics: { ...RESULT.statistics, totalElements: 0, textElements: 0 },
      }}
    />,
  );
  expect(screen.getByText(/no text found/i)).toBeInTheDocument();
});

test("shows the markdown view when that format was requested", () => {
  render(
    <OcrResults
      {...props}
      result={{
        ...RESULT,
        markdown: "# Invoice",
        config: { ...RESULT.config, outputFormat: "markdown" },
      }}
    />,
  );
  expect(screen.getByText("# Invoice")).toBeInTheDocument();
});
