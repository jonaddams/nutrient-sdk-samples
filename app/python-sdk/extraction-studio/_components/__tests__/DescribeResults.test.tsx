import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DescribeResult } from "../../lib/describe";
import { DescribeResults } from "../DescribeResults";

const result = (over: Partial<DescribeResult> = {}): DescribeResult => ({
  engine: "VLM_DESCRIBE",
  filename: "lumen-invoice.pdf",
  provider: "claude",
  level: "detailed",
  promptUsed: "(default)",
  text: "A commercial invoice from Lumen Industries dated March 2025.",
  code: "print('hi')",
  timingMs: 4200,
  ...over,
});

describe("DescribeResults", () => {
  it("offers three views", () => {
    render(<DescribeResults result={result()} />);
    const group = screen.getByRole("group", { name: "View" });
    for (const name of ["Text", "JSON", "Code"]) {
      expect(group).toContainElement(screen.getByRole("button", { name }));
    }
  });

  it("shows the description as prose by default", () => {
    render(<DescribeResults result={result()} />);
    expect(screen.getByText(/Lumen Industries/)).toBeInTheDocument();
  });

  it("states the page-1 limit, because it is a property of the SDK path", () => {
    render(<DescribeResults result={result()} />);
    expect(screen.getByText(/page 1/i)).toBeInTheDocument();
  });

  it("reports the detail level and elapsed time", () => {
    render(
      <DescribeResults
        result={result({ level: "detailed", timingMs: 4200 })}
      />,
    );
    expect(screen.getByText(/detailed/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.2s/)).toBeInTheDocument();
  });

  it("shows the JSON envelope without the code field", async () => {
    render(<DescribeResults result={result()} />);
    await userEvent.click(screen.getByRole("button", { name: "JSON" }));
    const pre = screen.getByText(/"promptUsed"/);
    expect(pre.textContent).toContain("VLM_DESCRIBE");
    // The snippet has its own segment; duplicating it here bloats the view.
    expect(pre.textContent).not.toContain('"code"');
  });

  it("shows the snippet in the Code view", async () => {
    render(<DescribeResults result={result()} />);
    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(screen.getByText("print('hi')")).toBeInTheDocument();
  });

  it("says so rather than blanking when the backend sends no snippet", async () => {
    render(<DescribeResults result={result({ code: undefined })} />);
    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(screen.getByText(/code snippet unavailable/i)).toBeInTheDocument();
  });

  it("hands Copy the same placeholder the pane shows, not an empty string", async () => {
    // payload() used to fall back to "" while the pane displayed the
    // placeholder text — Copy/Download silently produced an empty file that
    // contradicted what was on screen. The two must read from one constant.
    const writeText = vi.fn((_text: string) => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(<DescribeResults result={result({ code: undefined })} />);
    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("code snippet unavailable"),
    );
  });

  it("names its empty state rather than showing a blank pane", () => {
    render(<DescribeResults result={result({ text: "" })} />);
    expect(screen.getByRole("status")).toHaveTextContent(/no description/i);
  });

  it("still offers the Code view on an empty result", () => {
    // OcrResults keeps its actions row inside the non-empty branch, so a
    // no-result run offers no Code view — the moment a prospect most wants to
    // see the call. Not repeating that here.
    render(<DescribeResults result={result({ text: "" })} />);
    expect(screen.getByRole("button", { name: "Code" })).toBeInTheDocument();
  });

  it("reports the prompt when one was used", () => {
    render(
      <DescribeResults result={result({ promptUsed: "Transcribe it." })} />,
    );
    expect(screen.getByText(/custom prompt/i)).toBeInTheDocument();
  });
});
