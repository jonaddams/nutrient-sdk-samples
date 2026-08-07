import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
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
