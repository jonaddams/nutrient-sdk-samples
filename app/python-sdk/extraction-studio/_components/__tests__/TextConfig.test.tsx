import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextConfig } from "../TextConfig";

const props = {
  docPath: "/invoices/Invoice AC-2025-1047.pdf",
  filename: "Invoice AC-2025-1047.pdf",
};

describe("TextConfig", () => {
  it("offers no controls, because export_as_text takes no options", () => {
    render(<TextConfig {...props} onRun={() => {}} runSignal={0} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("names the panel distinctly from every other config section", () => {
    // page.test.tsx's CONFIG_PANEL_MARKERS identifies each feature's config by
    // a marker absent from all the others; "Configuration" is taken.
    render(<TextConfig {...props} onRun={() => {}} runSignal={0} />);
    expect(
      screen.getByRole("group", { name: "Text layer" }),
    ).toBeInTheDocument();
  });

  it("warns that a scan returns nothing, before the presenter hits it", () => {
    render(<TextConfig {...props} onRun={() => {}} runSignal={0} />);
    expect(screen.getByText(/scanned/i)).toBeInTheDocument();
  });

  it("issues no network request on mount", () => {
    // Credential-free: no /providers fetch, no provider gate.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<TextConfig {...props} onRun={() => {}} runSignal={0} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not run on the initial render", () => {
    // Run lives in the panel head and arrives as an incrementing signal;
    // 0 is not a request to run.
    const onRun = vi.fn();
    render(<TextConfig {...props} onRun={onRun} runSignal={0} />);
    expect(onRun).not.toHaveBeenCalled();
  });

  it("runs with the current document when the signal increments", () => {
    const onRun = vi.fn();
    const { rerender } = render(
      <TextConfig {...props} onRun={onRun} runSignal={0} />,
    );
    rerender(<TextConfig {...props} onRun={onRun} runSignal={1} />);
    expect(onRun).toHaveBeenCalledWith({
      docPath: props.docPath,
      filename: props.filename,
    });
  });
});
