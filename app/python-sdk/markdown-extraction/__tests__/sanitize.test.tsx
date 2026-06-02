import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";

// Mirror the exact plugin chain used by markdown-extraction/page.tsx so this
// test verifies the real sanitization behavior, not a stand-in.
function renderMarkdown(md: string): string {
  return renderToStaticMarkup(
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
    >
      {md}
    </ReactMarkdown>,
  );
}

describe("markdown rendering with rehype-raw + rehype-sanitize", () => {
  it("strips <script> tags from embedded HTML", () => {
    const out = renderMarkdown("# Hi\n\n<script>alert('xss')</script>\n");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert('xss')");
  });

  it("strips event-handler attributes like onerror", () => {
    const out = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("alert(1)");
  });

  it("neutralizes javascript: hrefs", () => {
    const out = renderMarkdown('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain("javascript:");
  });

  it("preserves the embedded HTML tables the demo relies on", () => {
    const md =
      "<table><thead><tr><th>Item</th></tr></thead><tbody><tr><td>Total</td></tr></tbody></table>";
    const out = renderMarkdown(md);
    expect(out).toContain("<table");
    expect(out).toContain("<td");
    expect(out).toContain("Total");
  });

  it("preserves normal markdown formatting (headings)", () => {
    const out = renderMarkdown("# Section Title\n\nSome **bold** text.");
    expect(out).toContain("<h1");
    expect(out).toContain("Section Title");
    expect(out).toContain("<strong");
  });
});
