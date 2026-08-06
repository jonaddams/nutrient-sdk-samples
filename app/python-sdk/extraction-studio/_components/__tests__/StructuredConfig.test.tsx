import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { presetFor } from "../../lib/categories";
import { StructuredConfig } from "../StructuredConfig";

const invoices = presetFor("invoices");

afterEach(() => {
  vi.restoreAllMocks();
});

const PROVIDERS = [
  { id: "openai", label: "OpenAI", models: [], defaultModel: "gpt-5.4" },
  {
    id: "bedrock",
    label: "AWS Bedrock",
    models: [
      { id: "google.gemma-3-27b-it", label: "Gemma 3 27B" },
      { id: "qwen.qwen3-vl-235b-a22b-instruct", label: "Qwen3-VL 235B" },
    ],
    defaultModel: "qwen.qwen3-vl-235b-a22b-instruct",
  },
];

function stubProviders(providers: unknown = PROVIDERS, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 503,
      json: async () => ({ providers }),
    })) as unknown as typeof fetch,
  );
}

beforeEach(() => {
  stubProviders();
});

test("populates the provider select from the backend", async () => {
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  await waitFor(() =>
    expect(screen.getByRole("option", { name: "AWS Bedrock" })).toBeDefined(),
  );
});

test("shows no model select for a single-model provider", async () => {
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  await waitFor(() => screen.getByRole("option", { name: "AWS Bedrock" }));
  // OpenAI is selected by default and publishes no models.
  expect(screen.queryByLabelText("Model")).toBeNull();
});

test("shows a model select once a multi-model provider is chosen", async () => {
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  await waitFor(() => screen.getByRole("option", { name: "AWS Bedrock" }));
  fireEvent.change(screen.getByLabelText("Provider"), {
    target: { value: "bedrock" },
  });
  expect(screen.getByLabelText("Model")).toBeDefined();
  expect(screen.getByRole("option", { name: "Gemma 3 27B" })).toBeDefined();
});

test("sends the selected model with the run request", async () => {
  const onRun = vi.fn();
  const props = {
    docPath: "/documents/doc-1.pdf",
    filename: "doc-1.pdf",
    onRun,
    schemaPreset: invoices,
  };
  const { rerender } = render(<StructuredConfig {...props} runSignal={0} />);
  await waitFor(() => screen.getByRole("option", { name: "AWS Bedrock" }));
  fireEvent.change(screen.getByLabelText("Provider"), {
    target: { value: "bedrock" },
  });
  fireEvent.change(screen.getByLabelText("Model"), {
    target: { value: "google.gemma-3-27b-it" },
  });
  rerender(<StructuredConfig {...props} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith(
    expect.objectContaining({
      provider: "bedrock",
      model: "google.gemma-3-27b-it",
    }),
  );
});

test("switching provider drops the previous provider's model", async () => {
  // Otherwise a Bedrock model id would ride along to OpenAI and earn a 400.
  const onRun = vi.fn();
  const props = {
    docPath: "/documents/doc-1.pdf",
    filename: "doc-1.pdf",
    onRun,
    schemaPreset: invoices,
  };
  const { rerender } = render(<StructuredConfig {...props} runSignal={0} />);
  await waitFor(() => screen.getByRole("option", { name: "AWS Bedrock" }));
  const providerSelect = screen.getByLabelText("Provider");
  fireEvent.change(providerSelect, { target: { value: "bedrock" } });
  fireEvent.change(screen.getByLabelText("Model"), {
    target: { value: "google.gemma-3-27b-it" },
  });
  fireEvent.change(providerSelect, { target: { value: "openai" } });
  rerender(<StructuredConfig {...props} runSignal={1} />);
  expect(onRun).toHaveBeenCalledWith(
    expect.objectContaining({ provider: "openai", model: undefined }),
  );
});

// Loading and failure both disable the select, so "disabled" alone cannot tell
// a prospect which one they are looking at. Before these, the in-flight state
// showed the ready help text over an empty box, which reads as a broken
// control rather than a pending one.
test("shows a distinct loading state while the providers fetch is in flight", () => {
  // Deliberately not awaited: this asserts the state DURING the fetch.
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  const select = screen.getByLabelText("Provider") as HTMLSelectElement;
  expect(select.disabled).toBe(true);
  expect(select).toHaveAttribute("aria-busy", "true");
  // A placeholder option, so the box is never blank.
  expect(
    screen.getByRole("option", { name: "Loading providers…" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Checking which providers this backend can serve…"),
  ).toBeInTheDocument();
});

test("the loading placeholder keeps the controlled select's value matched", () => {
  // An option whose value is not `provider` would leave the controlled select
  // with no matching option, and React would fall back to the first one.
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  const select = screen.getByLabelText("Provider") as HTMLSelectElement;
  expect(select.value).toBe("openai");
  expect(
    (
      screen.getByRole("option", {
        name: "Loading providers…",
      }) as HTMLOptionElement
    ).value,
  ).toBe("openai");
});

test("clears the loading state once providers resolve", async () => {
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  await waitFor(() => screen.getByRole("option", { name: "AWS Bedrock" }));
  const select = screen.getByLabelText("Provider") as HTMLSelectElement;
  expect(select.disabled).toBe(false);
  expect(select).not.toHaveAttribute("aria-busy");
  expect(
    screen.queryByRole("option", { name: "Loading providers…" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("Which model backend runs the extraction."),
  ).toBeInTheDocument();
});

test("a failed fetch reports failure, not loading", async () => {
  stubProviders(null, false);
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  await waitFor(() =>
    screen.getByText(
      "Could not reach the backend, so the provider list is unavailable.",
    ),
  );
  const select = screen.getByLabelText("Provider") as HTMLSelectElement;
  expect(select).not.toHaveAttribute("aria-busy");
  expect(
    screen.queryByRole("option", { name: "Loading providers…" }),
  ).not.toBeInTheDocument();
});

test("disables the provider select when the fetch fails", async () => {
  stubProviders(null, false);
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Provider") as HTMLSelectElement).disabled,
    ).toBe(true),
  );
});

// The parent gates its Run control on this callback. These tests are the
// mechanism-level proof that "Run must be unavailable before providers
// resolve and after a failed fetch" holds — page.tsx wires
// `disabled={busy || !providersReady}` straight to this signal.
test("reports readiness only after the providers fetch resolves, never before", async () => {
  const onProvidersReady = vi.fn();
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
      onProvidersReady={onProvidersReady}
    />,
  );
  // Not called with true synchronously on mount — the fetch is still pending.
  expect(onProvidersReady).not.toHaveBeenCalledWith(true);
  await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(true));
});

test("reports not-ready, and never ready, after a failed providers fetch", async () => {
  stubProviders(null, false);
  const onProvidersReady = vi.fn();
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={vi.fn()}
      runSignal={0}
      schemaPreset={invoices}
      onProvidersReady={onProvidersReady}
    />,
  );
  await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(false));
  expect(onProvidersReady).not.toHaveBeenCalledWith(true);
});

test("mounting with a given runSignal does not call onRun", () => {
  const onRun = vi.fn();
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={onRun}
      runSignal={3}
      schemaPreset={invoices}
    />,
  );
  expect(onRun).not.toHaveBeenCalled();
});

test("incrementing runSignal calls onRun exactly once with the current config", () => {
  const onRun = vi.fn();
  const { rerender } = render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={onRun}
      runSignal={3}
      schemaPreset={invoices}
    />,
  );
  rerender(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={onRun}
      runSignal={4}
      schemaPreset={invoices}
    />,
  );
  expect(onRun).toHaveBeenCalledTimes(1);
  expect(onRun).toHaveBeenCalledWith(
    expect.objectContaining({
      docPath: "/documents/doc-1.pdf",
      filename: "doc-1.pdf",
      provider: "openai",
      instructions: "",
      includeSourceLocations: true,
      strict: false,
      includePageImages: false,
    }),
  );
  const req = onRun.mock.calls[0][0];
  expect(JSON.parse(req.schema).schema.properties).toHaveProperty(
    "invoiceNumber",
  );
});

test("incrementing runSignal twice calls onRun twice", () => {
  const onRun = vi.fn();
  const { rerender } = render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={onRun}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  rerender(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={onRun}
      runSignal={1}
      schemaPreset={invoices}
    />,
  );
  rerender(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={onRun}
      runSignal={2}
      schemaPreset={invoices}
    />,
  );
  expect(onRun).toHaveBeenCalledTimes(2);
});

// Scope of this test, stated precisely because an earlier version of this
// comment overclaimed it.
//
// It proves that value and label association stay correct across a removal.
// It does NOT prove that rows are keyed by a stable id rather than by array
// index. That was checked by mutation: reverting `key={p.id}` to `key={i}` in
// StructuredConfig leaves every test in this file passing. The reason is
// structural — every row input is a fully controlled React input, so React
// forces the DOM node's value to match the current prop whether that node is
// freshly mounted (stable-id key) or reused from a shifted index (index key).
// Value association is therefore invariant to the keying strategy and cannot
// discriminate between them.
//
// What actually differs by keying strategy is focus and IME composition state
// (see lib/schema.ts), and `document.activeElement` after a removal is not
// reliably meaningful under jsdom. The discriminator that WOULD work here is
// DOM node identity: capture the tracked row's input element, remove an
// earlier row, then assert the input now holding the tracked value is the same
// node object. Under index keys React reuses the earlier row's node, so that
// identity check fails. That test is still owed.
test("removing a middle row leaves the remaining rows' values intact and correctly associated", () => {
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={() => {}}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );

  // Add a fourth row so removing the middle row (issueDate, row 2) leaves
  // three rows behind, with the row under test landing third among them —
  // matching the "still the third row" claim being verified.
  fireEvent.click(screen.getByRole("button", { name: "+ Add property" }));
  const keyInputs = () =>
    screen.getAllByRole("textbox", { name: /^Property key \d+$/ });
  fireEvent.change(keyInputs()[3], { target: { value: "extraField" } });

  const trackedDescription = screen.getByRole("textbox", {
    name: "Description for extraField",
  });
  fireEvent.change(trackedDescription, {
    target: { value: "distinctive-value-xyz" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Remove issueDate" }));

  // The removed row is gone.
  expect(
    screen.queryByRole("textbox", { name: "Description for issueDate" }),
  ).not.toBeInTheDocument();

  // The tracked row's typed value survived the removal and is still reachable
  // under its own key's accessible name. Note this says nothing about whether
  // the underlying DOM node was reused — see the note above the test.
  expect(
    screen.getByRole("textbox", { name: "Description for extraField" }),
  ).toHaveValue("distinctive-value-xyz");

  // ...and it is still the third (last) row among the three that remain.
  const remaining = keyInputs();
  expect(remaining).toHaveLength(3);
  expect(remaining[2]).toHaveValue("extraField");
});

test("two freshly added blank rows have pairwise-distinct accessible names across all five controls", () => {
  render(
    <StructuredConfig
      docPath="/documents/doc-1.pdf"
      filename="doc-1.pdf"
      onRun={() => {}}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );

  const addButton = screen.getByRole("button", { name: "+ Add property" });
  fireEvent.click(addButton); // becomes row 4, key still ""
  fireEvent.click(addButton); // becomes row 5, key still ""

  // Both new rows are blank, so their accessible names can only be
  // disambiguated by position (the `property ${i + 1}` fallback in
  // StructuredConfig), not by key. Each getByRole call below throws if its
  // name matches zero or more-than-one element, which already proves
  // uniqueness across the whole page; the pairwise check afterwards further
  // confirms row 4 and row 5 never resolve to the same DOM node.
  const controlsFor = (n: number) => [
    screen.getByRole("textbox", { name: `Property key ${n}` }),
    screen.getByRole("combobox", { name: `Type for property ${n}` }),
    screen.getByRole("checkbox", { name: `Property ${n} is optional` }),
    screen.getByRole("button", { name: `Remove property ${n}` }),
    screen.getByRole("textbox", { name: `Description for property ${n}` }),
  ];

  const row4 = controlsFor(4);
  const row5 = controlsFor(5);
  expect(row4).toHaveLength(5);
  expect(row5).toHaveLength(5);
  for (const el of row4) {
    expect(row5).not.toContain(el);
  }
});

test("renders the rows it is given rather than a hardcoded default", () => {
  render(
    <StructuredConfig
      docPath="/documents/bol.pdf"
      filename="bol.pdf"
      onRun={() => {}}
      runSignal={0}
      schemaPreset={presetFor("logistics")}
    />,
  );
  expect(screen.getByRole("textbox", { name: "Property key 1" })).toHaveValue(
    "billOfLadingNumber",
  );
  expect(
    screen.queryByRole("textbox", { name: "Description for invoiceNumber" }),
  ).toBeNull();
});

test("a new preset replaces the rows, discarding hand-edits", () => {
  // Deliberate: a demo-er switching category wants that category's schema, not
  // their last experiment.
  const claims = presetFor("claims");
  const { rerender } = render(
    <StructuredConfig
      docPath="/documents/a.pdf"
      filename="a.pdf"
      onRun={() => {}}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Description for invoiceNumber" }),
    { target: { value: "a hand edit" } },
  );
  rerender(
    <StructuredConfig
      docPath="/documents/a.pdf"
      filename="a.pdf"
      onRun={() => {}}
      runSignal={0}
      schemaPreset={claims}
    />,
  );
  expect(screen.getByRole("textbox", { name: "Property key 1" })).toHaveValue(
    "claimNumber",
  );
  expect(
    screen.queryByRole("textbox", { name: "Description for invoiceNumber" }),
  ).toBeNull();
});

test("the run request carries the current preset's fields", () => {
  const onRun = vi.fn();
  const healthcare = presetFor("healthcare");
  const { rerender } = render(
    <StructuredConfig
      docPath="/documents/a.pdf"
      filename="a.pdf"
      onRun={onRun}
      runSignal={0}
      schemaPreset={healthcare}
    />,
  );
  rerender(
    <StructuredConfig
      docPath="/documents/a.pdf"
      filename="a.pdf"
      onRun={onRun}
      runSignal={1}
      schemaPreset={healthcare}
    />,
  );
  const properties = JSON.parse(onRun.mock.calls[0][0].schema).schema
    .properties;
  expect(properties).toHaveProperty("patientName");
  expect(properties).not.toHaveProperty("invoiceNumber");
});

test("re-rendering with the same preset does not reset edited rows", () => {
  // Guards the render-loop trap: a stable preset must settle, not re-fire. If
  // the effect's deps gain anything that changes per render, this fails.
  const { rerender } = render(
    <StructuredConfig
      docPath="/documents/a.pdf"
      filename="a.pdf"
      onRun={() => {}}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Description for invoiceNumber" }),
    { target: { value: "survives" } },
  );
  rerender(
    <StructuredConfig
      docPath="/documents/b.pdf"
      filename="b.pdf"
      onRun={() => {}}
      runSignal={0}
      schemaPreset={invoices}
    />,
  );
  expect(
    screen.getByRole("textbox", { name: "Description for invoiceNumber" }),
  ).toHaveValue("survives");
});
