import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DescribeConfig } from "../DescribeConfig";

vi.mock("../../lib/providers", () => ({ fetchProviders: vi.fn() }));

import { fetchProviders } from "../../lib/providers";

const provider = (id: string, label: string) => ({
  id,
  label,
  models: [],
  defaultModel: "",
});

const props = {
  docPath: "/documents/x.pdf",
  filename: "x.pdf",
  onRun: () => {},
  runSignal: 0,
};

afterEach(() => vi.clearAllMocks());

describe("DescribeConfig", () => {
  it("offers only the providers /describe accepts", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      provider("openai", "OpenAI"),
      provider("anthropic", "Anthropic"),
      provider("bedrock", "AWS Bedrock"),
      provider("local", "Local (LM Studio)"),
    ]);
    render(<DescribeConfig {...props} />);
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OpenAI" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("option", { name: "Anthropic" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "AWS Bedrock" })).toBeNull();
    expect(
      screen.queryByRole("option", { name: "Local (LM Studio)" }),
    ).toBeNull();
  });

  it("names the provider select through its label", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([provider("openai", "OpenAI")]);
    render(<DescribeConfig {...props} />);
    // Resolves the <label for> association. getByRole("combobox") would pass
    // without it and prove nothing.
    expect(screen.getByLabelText("Provider")).toBeInTheDocument();
  });

  it("keeps the loading placeholder's value matched to the select", () => {
    vi.mocked(fetchProviders).mockReturnValue(new Promise(() => {}));
    render(<DescribeConfig {...props} />);
    const select = screen.getByLabelText("Provider") as HTMLSelectElement;
    const placeholder = screen.getByRole("option", {
      name: /Loading providers/,
    }) as HTMLOptionElement;
    // Any other value leaves the controlled select with no matching option and
    // React renders the first — of which there is none while loading.
    expect(placeholder.value).toBe(select.value);
  });

  it("offers Standard and Detailed, defaulting to Standard", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([provider("openai", "OpenAI")]);
    render(<DescribeConfig {...props} />);
    const group = screen.getByRole("group", { name: "Detail" });
    expect(group).toContainElement(
      screen.getByRole("button", { name: "Standard" }),
    );
    expect(screen.getByRole("button", { name: "Standard" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("starts with an empty prompt, so the SDK's own default runs", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([provider("openai", "OpenAI")]);
    render(<DescribeConfig {...props} />);
    expect(screen.getByLabelText("Prompt")).toHaveValue("");
  });

  it("loads a preset's text into the prompt box", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([provider("openai", "OpenAI")]);
    render(<DescribeConfig {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Transcribe" }));
    expect(
      (screen.getByLabelText("Prompt") as HTMLTextAreaElement).value,
    ).toContain("verbatim");
  });

  it("exposes NO pressed state on the preset buttons", async () => {
    // They are load-this-text ACTIONS, not a mode. aria-pressed would assert a
    // mode that goes false the moment the textarea is edited, announcing the
    // wrong state to a screen reader with nothing in jsdom able to see it.
    vi.mocked(fetchProviders).mockResolvedValue([provider("openai", "OpenAI")]);
    render(<DescribeConfig {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Transcribe" }));
    for (const name of ["Describe", "Transcribe", "Summarise"]) {
      expect(screen.getByRole("button", { name })).not.toHaveAttribute(
        "aria-pressed",
      );
    }
  });

  it("says so and stays unrunnable when neither provider is configured", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      provider("bedrock", "AWS Bedrock"),
    ]);
    const onProvidersReady = vi.fn();
    render(<DescribeConfig {...props} onProvidersReady={onProvidersReady} />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/no provider/i),
    );
    expect(onProvidersReady).toHaveBeenCalledWith(false);
  });

  it("stays gated after a failed fetch", async () => {
    vi.mocked(fetchProviders).mockRejectedValue(new Error("down"));
    const onProvidersReady = vi.fn();
    render(<DescribeConfig {...props} onProvidersReady={onProvidersReady} />);
    await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(false));
  });

  it("maps anthropic to claude on the wire when Run fires", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      provider("anthropic", "Anthropic"),
    ]);
    const onRun = vi.fn();
    const { rerender } = render(
      <DescribeConfig {...props} onRun={onRun} runSignal={0} />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "Anthropic" }),
      ).toBeInTheDocument(),
    );
    rerender(<DescribeConfig {...props} onRun={onRun} runSignal={1} />);
    await waitFor(() => expect(onRun).toHaveBeenCalledOnce());
    expect(onRun.mock.calls[0][0]).toMatchObject({
      provider: "claude",
      level: "standard",
      prompt: "",
    });
  });

  it("does not run on the initial render", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([provider("openai", "OpenAI")]);
    const onRun = vi.fn();
    render(<DescribeConfig {...props} onRun={onRun} runSignal={0} />);
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OpenAI" }),
      ).toBeInTheDocument(),
    );
    expect(onRun).not.toHaveBeenCalled();
  });
});
