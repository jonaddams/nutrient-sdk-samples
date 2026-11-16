"use client";

import { useChat } from "@ai-sdk/react";
import type { ContentEditing, Instance } from "@nutrient-sdk/viewer";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createExecutor } from "./executor";
import { type ToolName, WRITE_TOOLS } from "./tools";
import "./styles.css";

const DOCUMENT = "/documents/service-agreement.pdf";

const SUGGESTIONS = [
  "Change the client to Acme Corporation, 200 Market Street, Seattle, WA 98101.",
  "Raise the rate to $175 per hour and make payment due within thirty (30) days.",
  "Make every numbered section heading dark blue.",
  "Add a DRAFT notice in red at the top-right of page 1.",
];

// Safety net on the browser-side loop: stop auto-resubmitting after this many
// tool calls in one turn, however the model behaves.
const MAX_TOOL_CALLS_PER_TURN = 30;

// `lost` is null when the SDK gives no report (pre-1.25 resolves void).
type SaveSummary =
  | { kind: "saved"; lost: number | null }
  | { kind: "discarded" };

function toolCallsSinceLastUser(messages: UIMessage[]) {
  let count = 0;
  for (
    let i = messages.length - 1;
    i >= 0 && messages[i].role !== "user";
    i--
  ) {
    count += messages[i].parts.filter((p) => p.type.startsWith("tool-")).length;
  }
  return count;
}

export default function AgenticContentEditingViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const executorRef = useRef<ReturnType<typeof createExecutor> | null>(null);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [input, setInput] = useState("");
  const [saveSummary, setSaveSummary] = useState<SaveSummary | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const NV = window.NutrientViewer;
    if (!container || !NV) return;

    const onState = (s: ContentEditing.ContentEditorStateChange) =>
      setDirty(s.isActive && s.isDirty);
    let instance: Instance | null = null;
    let cancelled = false;

    NV.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      toolbarItems: (NV.defaultToolbarItems ?? []).filter(
        (item: { type: string }) =>
          [
            "sidebar-thumbnails",
            "pager",
            "zoom-out",
            "zoom-in",
            "zoom-mode",
            "content-editor",
          ].includes(item.type),
      ),
    }).then((loaded: Instance) => {
      if (cancelled) return;
      instance = loaded;
      instanceRef.current = loaded;
      executorRef.current = createExecutor(loaded);
      loaded.addEventListener("contentEditor.stateChange", onState);
      setReady(true);
    });

    return () => {
      cancelled = true;
      instance?.removeEventListener("contentEditor.stateChange", onState);
      NV.unload(container);
      instanceRef.current = null;
      executorRef.current = null;
    };
  }, []);

  const {
    messages,
    sendMessage,
    addToolOutput,
    status,
    error,
    setMessages,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/web-sdk/agentic-content-editing/api/chat",
    }),
    sendAutomaticallyWhen: ({ messages }) =>
      lastAssistantMessageIsCompleteWithToolCalls({ messages }) &&
      toolCallsSinceLastUser(messages) < MAX_TOOL_CALLS_PER_TURN,
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
      const executor = executorRef.current;
      try {
        if (!executor) throw new Error("The viewer is not ready yet.");
        const output = await executor.execute(
          toolCall.toolName,
          toolCall.input,
        );
        addToolOutput({
          tool: toolCall.toolName as ToolName,
          toolCallId: toolCall.toolCallId,
          output,
        } as Parameters<typeof addToolOutput>[0]);
      } catch (e) {
        addToolOutput({
          tool: toolCall.toolName as ToolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: e instanceof Error ? e.message : String(e),
        } as Parameters<typeof addToolOutput>[0]);
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the transcript grows
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || !ready) return;
    setSaveSummary(null);
    sendMessage({ text: trimmed });
    setInput("");
  }

  async function save() {
    const instance = instanceRef.current;
    if (!instance) return;
    // Web SDK 1.25 resolves with a SaveResult; the repo's 1.16 typings say void.
    const result = (await instance.saveContentEditingSession()) as unknown as
      | { status: "reported"; uncoveredCodepoints: unknown[] }
      | { status: "reportUnavailable" }
      | undefined;
    const lost =
      result?.status === "reported" ? result.uncoveredCodepoints.length : null;
    setSaveSummary({ kind: "saved", lost });
    setDirty(false);
  }

  async function discard() {
    await instanceRef.current?.discardContentEditingSession();
    setSaveSummary({ kind: "discarded" });
    setDirty(false);
  }

  return (
    <div className="ace-wrapper">
      <div ref={containerRef} className="ace-viewer" />

      <aside className="ace-panel" aria-label="Editing agent">
        <div className="ace-head">
          <span className="ace-label">Editing agent</span>
          <button
            type="button"
            className="ace-link"
            onClick={() => {
              stop();
              setMessages([]);
            }}
            disabled={messages.length === 0}
          >
            New chat
          </button>
        </div>

        <div ref={listRef} className="ace-messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="ace-empty">
              <p>
                Ask for an edit in plain language. The agent reads the
                PDF&apos;s text blocks, edits them live in the content editor,
                and leaves Save or Discard to you.
              </p>
              <div className="ace-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="ace-chip"
                    onClick={() => send(s)}
                    disabled={!ready || busy}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <Message key={m.id} message={m} />)
          )}
          {busy && <div className="ace-status">Working…</div>}
          {error && (
            <div className="ace-error" role="alert">
              {error.message}
            </div>
          )}
        </div>

        <div className="ace-review">
          {saveSummary?.kind === "saved" && (
            <div className={saveSummary.lost ? "ace-warn" : "ace-ok"}>
              {saveSummary.lost === null
                ? "Saved."
                : saveSummary.lost > 0
                  ? `Saved. ${saveSummary.lost} block(s) lost characters the embedded fonts don't contain.`
                  : "Saved. Every character was written."}
            </div>
          )}
          {saveSummary?.kind === "discarded" && (
            <div className="ace-ok">Changes discarded.</div>
          )}
          <div className="ace-review-actions">
            <button
              type="button"
              className="ace-btn"
              onClick={discard}
              disabled={!dirty || busy}
            >
              Discard
            </button>
            <button
              type="button"
              className="ace-btn ace-btn-primary"
              onClick={save}
              disabled={!dirty || busy}
            >
              Save changes
            </button>
          </div>
        </div>

        <form
          className="ace-form"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            className="ace-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={ready ? "Describe an edit…" : "Loading document…"}
            rows={3}
            disabled={!ready}
            aria-label="Describe an edit"
          />
          <button
            type="submit"
            className="ace-btn ace-btn-primary"
            disabled={!ready || busy || !input.trim()}
          >
            Send
          </button>
        </form>
      </aside>
    </div>
  );
}

/** Write tools report layout warnings directly, or per paragraph under `results`. */
function collectWarnings(output: unknown): string[] {
  const o = output as
    | { warnings?: string[]; results?: { warnings?: string[] }[] }
    | undefined;
  return [
    ...(o?.warnings ?? []),
    ...(o?.results ?? []).flatMap((r) => r.warnings ?? []),
  ];
}

function Message({ message }: { message: UIMessage }) {
  return (
    <div className={`ace-msg ace-msg-${message.role}`}>
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;
        if (part.type === "text") {
          return message.role === "assistant" ? (
            // No rehype-raw: model output is untrusted, so raw HTML stays inert.
            <div key={key} className="ace-text ace-md">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                disallowedElements={["img"]}
                unwrapDisallowed
              >
                {part.text}
              </ReactMarkdown>
            </div>
          ) : (
            <p key={key} className="ace-text">
              {part.text}
            </p>
          );
        }
        if (part.type.startsWith("tool-") && "state" in part) {
          const name = part.type.slice(5) as ToolName;
          const failed = part.state === "output-error";
          const done = part.state === "output-available";
          const output = done ? part.output : undefined;
          const warnings = collectWarnings(output);
          return (
            <div
              key={key}
              className={`ace-tool${WRITE_TOOLS.has(name) ? " ace-tool-write" : ""}${failed ? " ace-tool-failed" : ""}`}
            >
              <span className="ace-tool-name">{name}</span>
              <span className="ace-tool-state">
                {failed ? "failed" : done ? "success" : "running"}
              </span>
              {failed && "errorText" in part && (
                <div className="ace-tool-detail">{String(part.errorText)}</div>
              )}
              {warnings.length > 0 && (
                <div className="ace-tool-detail">{warnings.join(" ")}</div>
              )}
              <details className="ace-tool-call">
                <summary>Show tool call</summary>
                <pre>
                  {JSON.stringify(
                    { input: "input" in part ? part.input : undefined, output },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
