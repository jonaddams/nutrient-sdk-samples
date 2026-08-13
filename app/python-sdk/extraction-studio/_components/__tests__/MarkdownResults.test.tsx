import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MarkdownResult } from "../../lib/markdown";
import { MarkdownResults } from "../MarkdownResults";

const result = (over: Partial<MarkdownResult> = {}): MarkdownResult => ({
  engine: "VLM_MARKDOWN",
  filename: "usenix-example-paper.pdf",
  provider: "claude",
  markdown: "# Heading\n\nBody text.\n",
  charCount: 24,
  totalPages: 3,
  processedPages: 3,
  ...over,
});

describe("MarkdownResults", () => {
  it("shows Source first, because that is what the SDK actually returned", () => {
    render(<MarkdownResults result={result()} />);
    expect(screen.getByText("# Heading", { exact: false })).toBeInTheDocument();
  });

  it("offers Source, Rendered, JSON and Code views", () => {
    render(<MarkdownResults result={result()} />);
    const group = screen.getByRole("group", { name: "View" });
    for (const name of ["Source", "JSON", "Code"]) {
      expect(group).toContainElement(screen.getByRole("button", { name }));
    }
  });

  it("reports pages and characters", () => {
    render(<MarkdownResults result={result()} />);
    expect(screen.getByText("3 pages")).toBeInTheDocument();
    expect(screen.getByText("24 chars")).toBeInTheDocument();
  });

  it("says one page without pluralising", () => {
    render(
      <MarkdownResults result={result({ totalPages: 1, processedPages: 1 })} />,
    );
    expect(screen.getByText("1 page")).toBeInTheDocument();
  });

  it("shows a partial result honestly when the 10-page cap stopped it early", () => {
    render(<MarkdownResults result={result({ processedPages: 2 })} />);
    expect(screen.getByText("2 of 3 pages")).toBeInTheDocument();
  });

  it("prints NO duration when timingMs is absent", () => {
    render(<MarkdownResults result={result()} />);
    // Not "0.0s", not an em dash. The backend sends no timingMs for this
    // endpoint yet, and inventing one would misreport performance.
    expect(screen.queryByText(/Elapsed time/)).not.toBeInTheDocument();
  });

  it("prints the duration once the backend sends one", () => {
    render(<MarkdownResults result={result({ timingMs: 12400 })} />);
    expect(screen.getByText("Elapsed time: 12.4s")).toBeInTheDocument();
  });

  it("shows the placeholder in the Code view when the backend sent no snippet", async () => {
    render(<MarkdownResults result={result()} />);
    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(
      screen.getByText("# code snippet unavailable from this backend"),
    ).toBeInTheDocument();
  });

  it("hands Copy exactly what the Code pane shows, never an empty string", async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<MarkdownResults result={result()} />);
    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("code snippet unavailable"),
    );
    vi.unstubAllGlobals();
  });

  it("drops code from the JSON view, since the snippet has its own segment", async () => {
    render(<MarkdownResults result={result({ code: "print('hi')" })} />);
    await userEvent.click(screen.getByRole("button", { name: "JSON" }));
    expect(screen.getByText(/"engine": "VLM_MARKDOWN"/)).toBeInTheDocument();
    expect(screen.queryByText(/print\('hi'\)/)).not.toBeInTheDocument();
  });

  it("names the empty case rather than showing a blank pane", () => {
    render(<MarkdownResults result={result({ markdown: "", charCount: 0 })} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No markdown returned",
    );
  });

  it("still offers the Code view when the run returned nothing", async () => {
    render(<MarkdownResults result={result({ markdown: "", charCount: 0 })} />);
    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(
      screen.getByText("# code snippet unavailable from this backend"),
    ).toBeInTheDocument();
  });
});

describe("MarkdownResults rendered view", () => {
  const renderedFor = async (markdown: string) => {
    render(<MarkdownResults result={result({ markdown })} />);
    await userEvent.click(screen.getByRole("button", { name: "Rendered" }));
  };

  it("offers a Rendered view alongside the others", () => {
    render(<MarkdownResults result={result()} />);
    const group = screen.getByRole("group", { name: "View" });
    expect(group).toContainElement(
      screen.getByRole("button", { name: "Rendered" }),
    );
  });

  it("shows the empty-result callout on Rendered too, never a blank pane", async () => {
    render(<MarkdownResults result={result({ markdown: "", charCount: 0 })} />);
    await userEvent.click(screen.getByRole("button", { name: "Rendered" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "No markdown returned",
    );
  });

  it("renders headings as real headings", async () => {
    await renderedFor("# Section Title\n\nSome **bold** text.");
    expect(
      screen.getByRole("heading", { name: "Section Title" }),
    ).toBeInTheDocument();
  });

  it("renders the embedded HTML tables the SDK emits", async () => {
    await renderedFor(
      "<table><thead><tr><th>Item</th></tr></thead><tbody><tr><td>Total</td></tr></tbody></table>",
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Total" })).toBeInTheDocument();
  });

  it("strips <script> from embedded HTML", async () => {
    const { container } = render(
      <MarkdownResults
        result={result({ markdown: "# Hi\n\n<script>alert('xss')</script>\n" })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rendered" }));
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("alert('xss')");
  });

  it("strips event-handler attributes", async () => {
    const { container } = render(
      <MarkdownResults
        result={result({ markdown: '<img src="x" onerror="alert(1)">' })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rendered" }));
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("alert(1)");
  });

  it("neutralizes javascript: hrefs", async () => {
    const { container } = render(
      <MarkdownResults
        result={result({ markdown: '<a href="javascript:alert(1)">click</a>' })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rendered" }));
    expect(container.innerHTML).not.toContain("javascript:");
  });

  it("strips an iframe, which only the sanitizer prevents", async () => {
    // The other three sanitize tests above pass even with rehypeSanitize
    // REMOVED from the plugin array: React itself drops a string onerror prop
    // and blanks a javascript: href, so those two measure React's defence
    // rather than the sanitizer's. Measured 2026-08-13 by rendering each case
    // through this project's real pipeline with sanitize deleted.
    //
    // An iframe is the vector React does NOT defend — it renders one happily,
    // and only rehype-sanitize's default schema removes it. So THIS is the test
    // that fails if someone deletes rehypeSanitize while leaving rehypeRaw.
    const { container } = render(
      <MarkdownResults
        result={result({
          markdown: '<iframe src="https://evil.example"></iframe>',
        })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rendered" }));
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.innerHTML).not.toContain("evil.example");
  });

  it("hands Copy the markdown SOURCE from the rendered view, not HTML", async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<MarkdownResults result={result()} />);
    await userEvent.click(screen.getByRole("button", { name: "Rendered" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    // The markdown is the artefact worth taking away; serialised DOM is not.
    expect(writeText).toHaveBeenCalledWith("# Heading\n\nBody text.\n");
    vi.unstubAllGlobals();
  });
});
