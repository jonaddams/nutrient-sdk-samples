import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { StructuredData } from "../../lib/api";
import { BENCHMARK } from "../../lib/benchmark";
import { confidencePct, StructuredResults } from "../StructuredResults";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // Clean up any prototype mutations
  delete (Element.prototype as any).scrollIntoView;
});

const data = {
  fields: [
    {
      name: "invoiceNumber",
      type: "string",
      value: "AC-1047",
      page: 0,
      confidence: 1.0,
      match: "exact",
      citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.3, y1: 0.15 },
    },
    {
      name: "totalAmount",
      type: "number",
      value: 512.4,
      page: 0,
      confidence: 0.86,
      match: "partial",
      citation: null,
    },
  ],
  extraction: {},
};

test("confidencePct formats a fraction", () => {
  expect(confidencePct(data.fields[1] as any)).toBe("86%");
});

test("renders field cards and reports selection", () => {
  const onSelect = vi.fn();
  render(
    <StructuredResults
      docId="test-doc"
      data={data as any}
      activeIndex={null}
      onSelectField={onSelect}
      showCitations={true}
      citationHex="#ffc107"
      onCitationHexChange={() => {}}
      onShowCitationsChange={() => {}}
    />,
  );
  expect(screen.getByText("invoiceNumber")).toBeInTheDocument();
  expect(screen.getByText("AC-1047")).toBeInTheDocument();
  fireEvent.click(screen.getByText("invoiceNumber"));
  expect(onSelect).toHaveBeenCalledWith(0);
});

test("shows timing, the citations switch and a Download button", () => {
  const data = {
    fields: [
      {
        name: "invoiceNumber",
        type: "string",
        value: "AC-2025-1047",
        page: 0,
        confidence: 0.95,
        match: "id_match",
        citation: { page: 0, x0: 0, y0: 0, x1: 1, y1: 1 },
      },
    ],
    extraction: { invoiceNumber: "AC-2025-1047" },
  };
  const onShowCitationsChange = vi.fn();
  render(
    <StructuredResults
      docId="test-doc"
      data={data as never}
      timingMs={7800}
      activeIndex={null}
      onSelectField={() => {}}
      showCitations={true}
      citationHex="#ffc107"
      onCitationHexChange={() => {}}
      onShowCitationsChange={onShowCitationsChange}
    />,
  );
  expect(screen.getByText("7.8s")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("switch", { name: "Show citations" }));
  expect(onShowCitationsChange).toHaveBeenCalledWith(false);
});

test("Download builds a JSON blob for Fields/Raw JSON view and a .py blob for Code view", async () => {
  const data = {
    fields: [
      {
        name: "invoiceNumber",
        type: "string",
        value: "AC-2025-1047",
        page: 0,
        confidence: 0.95,
        match: "id_match",
        citation: { page: 0, x0: 0, y0: 0, x1: 1, y1: 1 },
      },
    ],
    extraction: { invoiceNumber: "AC-2025-1047" },
  };
  const code = "print('hello')";

  const createObjectURL = vi.fn((_blob: Blob) => "blob:mock-url");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

  // The component never appends its anchor to the DOM, so the only way to
  // inspect it (its `download` filename) is to intercept its creation.
  const anchors: HTMLAnchorElement[] = [];
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
    const el = originalCreateElement(tagName, options);
    if (tagName === "a") anchors.push(el as HTMLAnchorElement);
    return el;
  });
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});

  render(
    <StructuredResults
      docId="test-doc"
      data={data as never}
      code={code}
      activeIndex={null}
      onSelectField={() => {}}
      showCitations={true}
      citationHex="#ffc107"
      onCitationHexChange={() => {}}
      onShowCitationsChange={() => {}}
    />,
  );

  // Fields view (default): downloads the extraction JSON.
  fireEvent.click(screen.getByRole("button", { name: "Download" }));

  expect(createObjectURL).toHaveBeenCalledTimes(1);
  const jsonBlob = createObjectURL.mock.calls[0][0] as Blob;
  expect(jsonBlob.type).toBe("application/json");
  await expect(jsonBlob.text()).resolves.toBe(
    JSON.stringify(data.extraction, null, 2),
  );
  expect(clickSpy).toHaveBeenCalledTimes(1);
  expect(anchors[0]?.download).toBe("extraction.json");
  expect(revokeObjectURL).not.toHaveBeenCalled();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

  // Code view: downloads the code as a .py file.
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  fireEvent.click(screen.getByRole("button", { name: "Download" }));

  expect(createObjectURL).toHaveBeenCalledTimes(2);
  const codeBlob = createObjectURL.mock.calls[1][0] as Blob;
  expect(codeBlob.type).toBe("text/x-python");
  await expect(codeBlob.text()).resolves.toBe(code);
  expect(clickSpy).toHaveBeenCalledTimes(2);
  expect(anchors[1]?.download).toBe("extraction.py");
});

test("scrolls the active field card into view", () => {
  const scrollIntoView = vi.fn();
  (Element.prototype as any).scrollIntoView = scrollIntoView;
  const data = {
    fields: [
      {
        name: "a",
        type: "string",
        value: "1",
        page: 0,
        confidence: 1,
        match: null,
        citation: null,
      },
      {
        name: "b",
        type: "string",
        value: "2",
        page: 0,
        confidence: 1,
        match: null,
        citation: null,
      },
    ],
    extraction: {},
  };
  render(
    <StructuredResults
      docId="test-doc"
      data={data as never}
      activeIndex={1}
      onSelectField={() => {}}
      showCitations={true}
      citationHex="#ffc107"
      onCitationHexChange={() => {}}
      onShowCitationsChange={() => {}}
    />,
  );
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  const activeCard = screen.getByText("b").closest("button");
  expect(scrollIntoView.mock.contexts[0]).toBe(activeCard);
});

test("degrades to a Python-commented placeholder when code is absent", () => {
  // Mirrors OcrResults. `code` is optional so the view can merge before the
  // backend deploys, but the placeholder only ever shows to someone who has
  // already run an extraction — so it must not tell them to run one.
  render(
    <StructuredResults
      docId="test-doc"
      data={data as never}
      activeIndex={null}
      onSelectField={() => {}}
      showCitations={true}
      citationHex="#ffc107"
      onCitationHexChange={() => {}}
      onShowCitationsChange={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(
    screen.getByText(/^# code snippet unavailable from this backend$/),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/run an extraction to see/),
  ).not.toBeInTheDocument();
});

test("the meta row names the provider and model that produced the fields", () => {
  // The worst of the provenance gaps before this: the studio offers four
  // providers and a model list per provider, so "the extraction got that
  // wrong" was unanswerable from the panel alone — and the known demo trap on
  // the flagship invoice (the retainage figure) is model-specific.
  render(
    <StructuredResults
      docId="test-doc"
      data={data as unknown as StructuredData}
      config={{ provider: "anthropic", model: "claude-sonnet-5" }}
      activeIndex={null}
      onSelectField={vi.fn()}
      showCitations={true}
      onShowCitationsChange={vi.fn()}
      citationHex="#4a6cf7"
      onCitationHexChange={vi.fn()}
    />,
  );
  // "Claude", not "anthropic": the studio's own id is an implementation
  // detail three sibling endpoints spell differently.
  expect(screen.getByText(/Claude · claude-sonnet-5/)).toBeTruthy();
});

test("no config means no provenance line rather than an empty one", () => {
  // The prop is optional so this component can render a result from a backend
  // that predates the echo. A bare separator would look like a rendering bug.
  render(
    <StructuredResults
      docId="test-doc"
      data={data as unknown as StructuredData}
      activeIndex={null}
      onSelectField={vi.fn()}
      showCitations={true}
      onShowCitationsChange={vi.fn()}
      citationHex="#4a6cf7"
      onCitationHexChange={vi.fn()}
    />,
  );
  expect(screen.queryByText(/·/)).toBeNull();
});

test("marks a wrong value against the answer key", () => {
  render(
    <StructuredResults
      docId="invoice-ac20251047"
      data={
        {
          extraction: { totalAmount: 1910500 },
          fields: [
            {
              name: "totalAmount",
              type: "number",
              value: 1910500,
              page: 0,
              confidence: 0.9,
              match: "id_match",
              citation: null,
            },
          ],
        } as unknown as StructuredData
      }
      code=""
      onSelectField={vi.fn()}
      activeIndex={null}
      showCitations={true}
      onShowCitationsChange={vi.fn()}
      citationHex="#ffc107"
      onCitationHexChange={vi.fn()}
    />,
  );
  const verdict = screen.getByText(/expected 345,015/);
  expect(verdict).toBeDefined();
  // Styling regression guard: the mismatch verdict must keep its own class —
  // it is the one the CSS gives distinct colour/weight so a non-technical
  // presenter notices it, unlike the other two verdict states.
  expect(verdict.className).toContain("mismatch");
});

test("marks a correct value with its own class, distinct from mismatch/unverified", () => {
  render(
    <StructuredResults
      docId="invoice-ac20251047"
      data={
        {
          extraction: { invoiceNumber: "AC-2025-1047" },
          fields: [
            {
              name: "invoiceNumber",
              type: "string",
              value: "AC-2025-1047",
              page: 0,
              confidence: 0.95,
              match: "exact",
              citation: null,
            },
          ],
        } as unknown as StructuredData
      }
      code=""
      onSelectField={vi.fn()}
      activeIndex={null}
      showCitations={true}
      onShowCitationsChange={vi.fn()}
      citationHex="#ffc107"
      onCitationHexChange={vi.fn()}
    />,
  );
  const verdict = screen.getByText("✓");
  expect(verdict.className).toContain("match");
  expect(verdict.className).not.toContain("mismatch");
});

test("shows a field with no answer key as not verified, never as wrong", () => {
  render(
    <StructuredResults
      docId="invoice-ac20251047"
      data={
        {
          extraction: { somethingElse: "x" },
          fields: [
            {
              name: "somethingElse",
              type: "string",
              value: "x",
              page: 0,
              confidence: 0.9,
              match: "id_match",
              citation: null,
            },
          ],
        } as unknown as StructuredData
      }
      code=""
      onSelectField={vi.fn()}
      activeIndex={null}
      showCitations={true}
      onShowCitationsChange={vi.fn()}
      citationHex="#ffc107"
      onCitationHexChange={vi.fn()}
    />,
  );
  const verdict = screen.getByText(/not verified/);
  expect(verdict).toBeDefined();
  expect(verdict.className).toContain("unverified");
  expect(screen.queryByText(/expected/)).toBeNull();
});

test("the run summary counts only verified fields", () => {
  // Lumen fixture, confirmed answer key: totalAmount matches, issueDate is
  // the payment-due date (the key holds the printed Invoice Date instead)
  // and does not, invoiceNumber matches. So 2 of 3 verified fields match —
  // asserted as the exact string, not a shape that would pass regardless of
  // the numbers.
  render(
    <StructuredResults
      docId="lumen-invoice"
      data={
        {
          extraction: {},
          fields: [
            {
              name: "totalAmount",
              type: "number",
              value: 88.06,
              page: 0,
              confidence: 0.9,
              match: "id_match",
              citation: null,
            },
            {
              name: "issueDate",
              type: "string",
              value: "December 16, 2022",
              page: 0,
              confidence: 0.9,
              match: "id_match",
              citation: null,
            },
            {
              name: "invoiceNumber",
              type: "string",
              value: "616770524",
              page: 0,
              confidence: 0.9,
              match: "id_match",
              citation: null,
            },
          ],
        } as unknown as StructuredData
      }
      code=""
      onSelectField={vi.fn()}
      activeIndex={null}
      showCitations={true}
      onShowCitationsChange={vi.fn()}
      citationHex="#ffc107"
      onCitationHexChange={vi.fn()}
    />,
  );
  expect(screen.getByText("2 of 3 verified fields match")).toBeDefined();
});

test("the accuracy segment shows the benchmark for the current document with its caveats", () => {
  // "bill-of-lading" on purpose, not the flagship invoice: all 14 documents
  // in lib/benchmark.ts share the same three model ids, and several also
  // share their matched/verified numbers (e.g. every one of gpt-5.4,
  // claude-sonnet-5 and the Bedrock model scores 3 of 3 on more than one
  // doc). A test that only checks row count and model-id text would still
  // pass if the component filtered to the wrong document — a prior version
  // of this test did exactly that, undetected, because it happened to use
  // two documents (invoice-ac20251047 and lumen-invoice) that both score
  // "3 of 3" on two of their three rows. bill-of-lading's triple — 6 of 6,
  // 6 of 6, 3 of 6 — is not shared by any other document, so asserting the
  // exact fraction alongside each model actually proves the filter.
  const { container } = render(
    <StructuredResults
      docId="bill-of-lading"
      data={{ extraction: {}, fields: [] } as unknown as StructuredData}
      code=""
      onSelectField={vi.fn()}
      activeIndex={null}
      showCitations={true}
      onShowCitationsChange={vi.fn()}
      citationHex="#ffc107"
      onCitationHexChange={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Accuracy" }));

  const rows = BENCHMARK.rows.filter((r) => r.docId === "bill-of-lading");
  expect(rows.length).toBeGreaterThan(0);
  const renderedRows = Array.from(
    container.querySelectorAll(".benchmark-table tbody tr"),
  );
  expect(renderedRows.length).toBe(rows.length);
  for (const r of rows) {
    // Look up the row by model, then assert ITS OWN fraction — not just
    // that the model string and some row count are both present, which is
    // exactly the pairing the prior test skipped.
    const row = renderedRows.find((tr) => tr.textContent?.includes(r.model));
    expect(row).toBeDefined();
    expect(row?.textContent).toContain(`${r.matched} of ${r.verified}`);
  }

  // The four caveats the brief requires, plus the two the human ruling and
  // the latency data added: sample-corpus scope, the scoring rule for a
  // blank verified field, latency variance, and the non-determinism caveat
  // on "reproduce it live".
  expect(screen.getByText(/measured/i)).toBeDefined();
  expect(screen.getByText(/these sample documents/i)).toBeDefined();
  expect(screen.getByText(/not correct, not as unscored/i)).toBeDefined();
  expect(screen.getByText(/not steady rates/i)).toBeDefined();
  expect(screen.getByText(/pressing Run/)).toBeDefined();
  expect(screen.getByText(/not deterministic/i)).toBeDefined();
});
