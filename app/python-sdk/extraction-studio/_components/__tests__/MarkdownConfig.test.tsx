import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarkdownConfig } from "../MarkdownConfig";

vi.mock("../../lib/providers", () => ({
  fetchProviders: vi.fn(),
}));
const { fetchProviders } = await import("../../lib/providers");

const props = {
  docPath: "/documents/usenix-example-paper.pdf",
  filename: "usenix-example-paper.pdf",
  runSignal: 0,
  onRun: vi.fn(),
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("MarkdownConfig", () => {
  it("offers only the providers this endpoint can serve", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      { id: "openai", label: "OpenAI" },
      { id: "anthropic", label: "Claude" },
      { id: "bedrock", label: "AWS Bedrock" },
      { id: "local", label: "Local" },
    ] as never);
    render(<MarkdownConfig {...props} />);
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "Claude" }),
      ).toBeInTheDocument(),
    );
    // Bedrock and Local run on a different mechanism; the endpoint accepts
    // only claude|openai, so offering them would earn a rejected request.
    expect(
      screen.queryByRole("option", { name: "AWS Bedrock" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Local" }),
    ).not.toBeInTheDocument();
  });

  it("maps anthropic to claude on the wire", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      { id: "anthropic", label: "Claude" },
    ] as never);
    const onRun = vi.fn();
    const { rerender } = render(<MarkdownConfig {...props} onRun={onRun} />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
    rerender(<MarkdownConfig {...props} onRun={onRun} runSignal={1} />);
    // The studio says "anthropic"; this endpoint only knows "claude".
    expect(onRun).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "claude" }),
    );
  });

  it("passes openai through unchanged", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      { id: "openai", label: "OpenAI" },
    ] as never);
    const onRun = vi.fn();
    const { rerender } = render(<MarkdownConfig {...props} onRun={onRun} />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
    rerender(<MarkdownConfig {...props} onRun={onRun} runSignal={1} />);
    expect(onRun).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "openai", filename: props.filename }),
    );
  });

  it("does not run on mount, only on a changed signal", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      { id: "openai", label: "OpenAI" },
    ] as never);
    const onRun = vi.fn();
    render(<MarkdownConfig {...props} onRun={onRun} />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
    expect(onRun).not.toHaveBeenCalled();
  });

  it("reports readiness once a usable provider exists", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      { id: "openai", label: "OpenAI" },
    ] as never);
    const onProvidersReady = vi.fn();
    render(<MarkdownConfig {...props} onProvidersReady={onProvidersReady} />);
    await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(true));
  });

  it("reports not-ready and explains itself when neither provider is configured", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      { id: "bedrock", label: "AWS Bedrock" },
    ] as never);
    const onProvidersReady = vi.fn();
    render(<MarkdownConfig {...props} onProvidersReady={onProvidersReady} />);
    await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(false));
    expect(screen.getByRole("status")).toHaveTextContent(
      "No provider available",
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("reports not-ready when the backend cannot be reached", async () => {
    vi.mocked(fetchProviders).mockRejectedValue(new Error("network"));
    const onProvidersReady = vi.fn();
    render(<MarkdownConfig {...props} onProvidersReady={onProvidersReady} />);
    await waitFor(() => expect(onProvidersReady).toHaveBeenCalledWith(false));
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("lets a chosen provider reach the request", async () => {
    vi.mocked(fetchProviders).mockResolvedValue([
      { id: "openai", label: "OpenAI" },
      { id: "anthropic", label: "Claude" },
    ] as never);
    const onRun = vi.fn();
    const { rerender } = render(<MarkdownConfig {...props} onRun={onRun} />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
    await userEvent.selectOptions(screen.getByRole("combobox"), "anthropic");
    rerender(<MarkdownConfig {...props} onRun={onRun} runSignal={1} />);
    expect(onRun).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "claude" }),
    );
  });
});
