import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TablesConfig } from "../TablesConfig";

vi.mock("../../lib/providers", () => ({
  fetchProviders: vi.fn(),
}));

import { fetchProviders } from "../../lib/providers";

const provider = (id: string, label: string) => ({
  id,
  label,
  models: [],
  defaultModel: "",
});

afterEach(() => {
  vi.clearAllMocks();
});

const props = {
  docPath: "/documents/x.pdf",
  filename: "x.pdf",
  onRun: () => {},
  runSignal: 0,
};

describe("TablesConfig", () => {
  it("offers only the providers /tables accepts", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      provider("openai", "OpenAI"),
      provider("anthropic", "Anthropic"),
      provider("bedrock", "AWS Bedrock"),
      provider("local", "Local (LM Studio)"),
    ]);
    render(<TablesConfig {...props} />);
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OpenAI" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("option", { name: "Anthropic" }),
    ).toBeInTheDocument();
    // /tables runs the Claude-settings path and accepts only claude|openai.
    // Bedrock would also return a null confidenceComponents (SDK-048), which
    // is what the per-cell confidence view is built on.
    expect(screen.queryByRole("option", { name: "AWS Bedrock" })).toBeNull();
    expect(
      screen.queryByRole("option", { name: "Local (LM Studio)" }),
    ).toBeNull();
  });

  it("says so and stays unrunnable when neither is configured", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      provider("bedrock", "AWS Bedrock"),
    ]);
    const onProvidersReady = vi.fn();
    render(<TablesConfig {...props} onProvidersReady={onProvidersReady} />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/no provider/i),
    );
    // An empty filtered list is a legitimate answer, but Run must not offer a
    // request that can only 500.
    expect(onProvidersReady).toHaveBeenCalledWith(false);
  });

  it("marks the select busy while the fetch is in flight", () => {
    vi.mocked(fetchProviders).mockReturnValue(new Promise(() => {}));
    render(<TablesConfig {...props} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-busy", "true");
  });

  it("the loading placeholder keeps the controlled select's value matched", () => {
    // An option whose value is not `provider` would leave the controlled
    // select with no matching option, and React would fall back to the first
    // one — of which there is none while loading, so the box would appear
    // blank. Mirrors StructuredConfig.test.tsx's test of the same name.
    vi.mocked(fetchProviders).mockReturnValue(new Promise(() => {}));
    render(<TablesConfig {...props} />);
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

  it("reports readiness once a usable provider list arrives", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([provider("openai", "OpenAI")]);
    const onProvidersReady = vi.fn();
    render(<TablesConfig {...props} onProvidersReady={onProvidersReady} />);
    await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(true));
  });

  it("stays gated after a failed fetch", async () => {
    vi.mocked(fetchProviders).mockRejectedValue(new Error("down"));
    const onProvidersReady = vi.fn();
    render(<TablesConfig {...props} onProvidersReady={onProvidersReady} />);
    await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(false));
    expect(screen.getByRole("combobox")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("maps anthropic to claude on the wire when Run fires", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      provider("anthropic", "Anthropic"),
    ]);
    const onRun = vi.fn();
    const { rerender } = render(
      <TablesConfig {...props} onRun={onRun} runSignal={0} />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "Anthropic" }),
      ).toBeInTheDocument(),
    );
    rerender(<TablesConfig {...props} onRun={onRun} runSignal={1} />);
    await waitFor(() => expect(onRun).toHaveBeenCalledOnce());
    // The studio calls it "anthropic"; /tables only knows "claude".
    expect(onRun.mock.calls[0][0]).toMatchObject({ provider: "claude" });
  });

  it("does not run on the initial render", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([provider("openai", "OpenAI")]);
    const onRun = vi.fn();
    render(<TablesConfig {...props} onRun={onRun} runSignal={0} />);
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OpenAI" }),
      ).toBeInTheDocument(),
    );
    // runSignal 0 is not a request to run.
    expect(onRun).not.toHaveBeenCalled();
  });

  it("gives the provider select an accessible name via its label", () => {
    vi.mocked(fetchProviders).mockResolvedValue([provider("openai", "OpenAI")]);
    render(<TablesConfig {...props} />);
    // getByLabelText resolves the <label for> association — the mechanism that
    // replaced a duplicated aria-label. Without htmlFor/id this throws.
    expect(screen.getByLabelText("Provider")).toBeInTheDocument();
  });
});
