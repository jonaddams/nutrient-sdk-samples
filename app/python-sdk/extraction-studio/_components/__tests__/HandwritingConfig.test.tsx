import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { HandwritingConfig } from "../HandwritingConfig";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", models: [], defaultModel: "gpt-4.1" },
  { id: "anthropic", label: "Claude", models: [], defaultModel: "claude" },
];

function stubProviders(list: unknown[] = PROVIDERS) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ providers: list }) })),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

function setup() {
  const onRun = vi.fn();
  const onProvidersReady = vi.fn();
  const view = render(
    <HandwritingConfig
      docPath="/documents/note.jpg"
      filename="note.jpg"
      onRun={onRun}
      runSignal={0}
      onProvidersReady={onProvidersReady}
    />,
  );
  return { onRun, onProvidersReady, view };
}

test("the provider select is absent until VLM-enhanced is chosen", async () => {
  stubProviders();
  setup();
  expect(screen.queryByLabelText(/Provider/)).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "VLM-enhanced" }));
  await waitFor(() => expect(screen.getByLabelText(/Provider/)).toBeTruthy());
});

test("Local ICR is ready without waiting for any provider fetch", async () => {
  // Local runs on the backend machine with no credentials. Gating Run on a
  // provider list it never uses would make the on-prem engine the slowest one
  // to become clickable — and unusable on a deployment with no keys at all.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
  const { onProvidersReady } = setup();
  await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(true));
});

test("switching to VLM-enhanced re-gates Run until providers resolve", async () => {
  stubProviders([]);
  const { onProvidersReady } = setup();
  await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(true));
  await userEvent.click(screen.getByRole("button", { name: "VLM-enhanced" }));
  await waitFor(() => expect(onProvidersReady).toHaveBeenLastCalledWith(false));
});

test("a run signal emits the local engine with no provider round trip", async () => {
  stubProviders();
  const { onRun, view } = setup();
  view.rerender(
    <HandwritingConfig
      docPath="/documents/note.jpg"
      filename="note.jpg"
      onRun={onRun}
      runSignal={1}
      onProvidersReady={vi.fn()}
    />,
  );
  await waitFor(() => expect(onRun).toHaveBeenCalled());
  expect(onRun.mock.calls[0][0]).toMatchObject({
    engine: "local",
    filename: "note.jpg",
  });
});

test("a VLM run sends the wire name, not the studio's provider id", async () => {
  // The studio says "anthropic"; this endpoint only knows "claude".
  stubProviders();
  const onRun = vi.fn();
  const onProvidersReady = vi.fn();
  const props = {
    docPath: "/documents/note.jpg",
    filename: "note.jpg",
    onRun,
    onProvidersReady,
  };
  const view = render(<HandwritingConfig {...props} runSignal={0} />);
  await userEvent.click(screen.getByRole("button", { name: "VLM-enhanced" }));
  await waitFor(() => expect(screen.getByLabelText(/Provider/)).toBeTruthy());
  await userEvent.selectOptions(screen.getByLabelText(/Provider/), "anthropic");
  view.rerender(<HandwritingConfig {...props} runSignal={1} />);
  await waitFor(() => expect(onRun).toHaveBeenCalled());
  expect(onRun.mock.calls[0][0]).toMatchObject({
    engine: "vlm",
    provider: "claude",
  });
});

test("a backend with neither provider says so instead of offering an empty select", async () => {
  stubProviders([]);
  setup();
  await userEvent.click(screen.getByRole("button", { name: "VLM-enhanced" }));
  await waitFor(() =>
    expect(screen.getByText(/No provider available/)).toBeTruthy(),
  );
});
