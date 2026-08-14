import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TextResult } from "../../lib/text";
import { TextResults } from "../TextResults";

// The Copy test replaces `navigator` wholesale; leaking that into later tests
// in this file would strip everything else off it.
afterEach(() => {
  vi.unstubAllGlobals();
});

const result = (over: Partial<TextResult> = {}): TextResult => ({
  engine: "TEXT",
  filename: "Invoice AC-2025-1047.pdf",
  text: "ATLAS CONSTRUCTION\nINVOICE NO: AC-2025-1047\n",
  charCount: 44,
  wordCount: 5,
  totalPages: 2,
  hasTextLayer: true,
  code: "import os\n",
  timingMs: 49,
  ...over,
});

describe("TextResults", () => {
  it("shows the text first, because that is what the SDK returned", () => {
    render(<TextResults result={result()} onUseOcr={() => {}} />);
    expect(
      screen.getByText("ATLAS CONSTRUCTION", { exact: false }),
    ).toBeInTheDocument();
  });

  it("reports a millisecond run as milliseconds, not 0.0s", () => {
    // The panel's whole claim is speed. Rendering 49ms as "0.0s" — which the
    // siblings' formatter does — deletes it.
    render(<TextResults result={result()} onUseOcr={() => {}} />);
    expect(screen.getByText(/49ms/)).toBeInTheDocument();
    expect(screen.queryByText(/0\.0s/)).not.toBeInTheDocument();
  });

  it("reports pages, words and characters", () => {
    render(<TextResults result={result()} onUseOcr={() => {}} />);
    expect(screen.getByText("2 pages")).toBeInTheDocument();
    expect(screen.getByText("5 words")).toBeInTheDocument();
    expect(screen.getByText("44 chars")).toBeInTheDocument();
  });

  it("says one page without pluralising", () => {
    render(
      <TextResults result={result({ totalPages: 1 })} onUseOcr={() => {}} />,
    );
    expect(screen.getByText("1 page")).toBeInTheDocument();
  });

  it("offers Text, JSON and Code views and no Rendered view", () => {
    render(<TextResults result={result()} onUseOcr={() => {}} />);
    const group = screen.getByRole("group", { name: "View" });
    for (const name of ["Text", "JSON", "Code"]) {
      expect(group).toContainElement(screen.getByRole("button", { name }));
    }
    // Plain text has nothing to render.
    expect(screen.queryByRole("button", { name: "Rendered" })).toBeNull();
  });

  it("explains an absent text layer and offers the OCR handoff", async () => {
    const onUseOcr = vi.fn();
    render(
      <TextResults
        result={result({
          text: "",
          charCount: 0,
          wordCount: 0,
          hasTextLayer: false,
        })}
        onUseOcr={onUseOcr}
      />,
    );
    expect(
      screen.getByText("No text layer in this document"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Switch to Adaptive OCR" }),
    );
    expect(onUseOcr).toHaveBeenCalledTimes(1);
  });

  it("keeps Code and JSON reachable on an empty run", () => {
    // TablesResults and DescribeResults put the actions row OUTSIDE the empty
    // branch on purpose, and OcrResults does the opposite. A run that returned
    // nothing is exactly when a prospect wants the Code view.
    render(
      <TextResults
        result={result({
          text: "",
          charCount: 0,
          wordCount: 0,
          hasTextLayer: false,
        })}
        onUseOcr={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("reads emptiness from hasTextLayer, not from the text itself", () => {
    // The backend owns this decision. A whitespace-only export is still "no
    // text layer" server-side, and the panel must agree rather than deciding
    // for itself — two emptiness literals is how a pane once said
    // "unavailable" while Copy handed over an empty string.
    render(
      <TextResults
        result={result({ text: "   \n  ", charCount: 6, hasTextLayer: false })}
        onUseOcr={() => {}}
      />,
    );
    expect(
      screen.getByText("No text layer in this document"),
    ).toBeInTheDocument();
  });

  it("shows the empty state on the flag even when text is non-empty", () => {
    // The discriminating fixture. The whitespace case above cannot tell
    // `!result.hasTextLayer` apart from `!result.text.trim()` — both are
    // falsy for "   \n  ". Only non-whitespace text with the flag false
    // separates them, and a trim-based implementation fails right here.
    //
    // The backend cannot actually produce this pairing today
    // (`hasTextLayer = bool(text.strip())`), and that is deliberate: this
    // test pins which value the PANEL treats as authoritative, not a
    // reachable response. Do not "correct" the fixture to match the
    // backend contract — doing so deletes the guard.
    render(
      <TextResults
        result={result({
          text: "leftover watermark text",
          charCount: 23,
          wordCount: 3,
          hasTextLayer: false,
        })}
        onUseOcr={() => {}}
      />,
    );
    expect(
      screen.getByText("No text layer in this document"),
    ).toBeInTheDocument();
    expect(screen.queryByText("leftover watermark text")).toBeNull();
  });

  it("hands Copy the view that is on screen", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<TextResults result={result()} onUseOcr={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenLastCalledWith(result().text);

    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenLastCalledWith("import os\n");
  });

  it("says so rather than showing a blank pane when the backend sent no snippet", async () => {
    render(
      <TextResults result={result({ code: undefined })} onUseOcr={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(screen.getByText(/code snippet unavailable/)).toBeInTheDocument();
  });

  it("omits the elapsed figure entirely when the backend did not send one", () => {
    render(
      <TextResults
        result={result({ timingMs: undefined })}
        onUseOcr={() => {}}
      />,
    );
    expect(screen.queryByText(/ms$/)).not.toBeInTheDocument();
    expect(screen.getByText("2 pages")).toBeInTheDocument();
  });
});
