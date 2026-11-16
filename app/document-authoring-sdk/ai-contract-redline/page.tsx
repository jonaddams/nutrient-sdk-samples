"use client";

import { useChat } from "@ai-sdk/react";
import { isAiWriteToolName } from "@nutrient-sdk/document-authoring-ai";
import { getAiToolkit } from "@nutrient-sdk/document-authoring-ai/editor";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SampleCanvas } from "@/app/_components/SampleCanvas";
import type { DocAuthDocument, DocAuthEditor, DocAuthSystem } from "../types";
import {
  type ChangeGroup,
  mergeRuns,
  newRevisionIds,
  type PendingRevision,
  reconcile,
  ruleIdOf,
} from "./changes";
import { AGENT_AUTHOR, CUSTOMER, PLAYBOOK } from "./playbook";
import "./styles.css";

const CONTRACT_URL = "/documents/vendor-msa.docx";
const RUN_PLAYBOOK =
  "Review this contract against the playbook and redline every clause that conflicts with it.";
// Safety net on the browser-side loop, whatever the model does.
const MAX_TOOL_CALLS_PER_TURN = 40;

type Tab = "review" | "changes" | "playbook";
type Toolkit = ReturnType<typeof getAiToolkit>;

/** The slice of the 2.x transaction/revisions API this page uses. */
type RevisionsDraft = {
  revisions: () => {
    all: () => PendingRevision[];
    accept: (s: { ids: string[] }) => unknown;
    reject: (s: { ids: string[] }) => unknown;
  };
  commentThreads: () => {
    all: () => {
      id: string;
      reply: (text: string) => void;
      resolve: () => void;
    }[];
  };
};

/** Write results carry `reviewComment: { created: true, threadId }`. */
function threadIdOf(result: unknown): string | undefined {
  const rc = (
    result as { reviewComment?: { created: boolean; threadId?: string } }
  )?.reviewComment;
  return rc?.created ? rc.threadId : undefined;
}
type TxDocument = {
  transaction: <T>(
    cb: (ctx: {
      draft: RevisionsDraft;
    }) => Promise<{ commit: boolean; result: T }>,
  ) => Promise<T>;
  on: (event: string, handler: () => void) => unknown;
  off: (event: string, handler: () => void) => unknown;
};
type ReviewEditor = DocAuthEditor & {
  setEditorMode: (mode: "edit" | "review" | "view") => void;
  getEditorMode: () => "edit" | "review" | "view";
  setAuthor: (name: string) => void;
};

async function readPending(doc: DocAuthDocument): Promise<PendingRevision[]> {
  return (doc as unknown as TxDocument).transaction(async ({ draft }) => ({
    commit: false,
    result: draft
      .revisions()
      .all()
      .map(({ id, type, preview }) => ({ id, type, preview })),
  }));
}

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

function download(buffer: ArrayBuffer, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([buffer], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AiContractRedlinePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<DocAuthSystem | null>(null);
  const editorRef = useRef<ReviewEditor | null>(null);
  const toolkitRef = useRef<Toolkit | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("review");
  const [tracked, setTracked] = useState(true);
  const [groups, setGroups] = useState<ChangeGroup[]>([]);
  const [previews, setPreviews] = useState<Record<string, PendingRevision>>({});
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("vendor-msa.docx");
  const groupsRef = useRef<ChangeGroup[]>([]);
  groupsRef.current = groups;

  const refreshChanges = useCallback(async () => {
    const doc = editorRef.current?.currentDocument();
    if (!doc) return;
    const pending = await readPending(doc);
    setPreviews(Object.fromEntries(pending.map((r) => [r.id, r])));
    setGroups((g) => reconcile(g, pending));
  }, []);

  // Live refresh when anyone (agent, user, or the in-editor accept/reject UI)
  // changes a revision. Re-bound whenever the document is replaced.
  const bindDocument = useCallback(
    (doc: DocAuthDocument) => {
      const d = doc as unknown as TxDocument;
      for (const e of [
        "revision.created",
        "revision.accepted",
        "revision.rejected",
      ]) {
        d.on(e, refreshChanges);
      }
      return () => {
        for (const e of [
          "revision.created",
          "revision.accepted",
          "revision.rejected",
        ]) {
          d.off(e, refreshChanges);
        }
      };
    },
    [refreshChanges],
  );
  const unbindRef = useRef<(() => void) | null>(null);

  const openDocument = useCallback(
    async (doc: DocAuthDocument) => {
      const editor = editorRef.current;
      if (!editor) return;
      unbindRef.current?.();
      editor.setCurrentDocument(doc);
      // Element ids are scoped to a toolkit session; start fresh per document.
      toolkitRef.current?.dispose();
      toolkitRef.current = getAiToolkit(editor as never);
      unbindRef.current = bindDocument(doc);
      setGroups([]);
      await refreshChanges();
    },
    [bindDocument, refreshChanges],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let editor: ReviewEditor | null = null;

    (async () => {
      for (let i = 0; i < 50 && !window.DocAuth; i++) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!window.DocAuth || cancelled) return;
      const system = await window.DocAuth.createDocAuthSystem();
      const bytes = await fetch(CONTRACT_URL).then((r) => r.arrayBuffer());
      const doc = await system.import(bytes, { format: "docx" });
      if (cancelled) return;
      editor = (await system.createEditor(container, {
        document: doc,
      })) as ReviewEditor;
      editor.setAuthor(AGENT_AUTHOR);
      editor.setEditorMode("review");
      systemRef.current = system;
      editorRef.current = editor;
      toolkitRef.current = getAiToolkit(editor as never);
      unbindRef.current = bindDocument(doc);
      setReady(true);
    })().catch((e) => console.error("[ai-contract-redline] init failed:", e));

    return () => {
      cancelled = true;
      unbindRef.current?.();
      toolkitRef.current?.dispose();
      editor?.destroy();
      editorRef.current = null;
    };
  }, [bindDocument]);

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
      api: "/document-authoring-sdk/ai-contract-redline/api/chat",
    }),
    sendAutomaticallyWhen: ({ messages }) =>
      lastAssistantMessageIsCompleteWithToolCalls({ messages }) &&
      toolCallsSinceLastUser(messages) < MAX_TOOL_CALLS_PER_TURN,
    async onToolCall({ toolCall }): Promise<void> {
      if (toolCall.dynamic) return;
      const toolkit = toolkitRef.current;
      const editor = editorRef.current;
      const output = (o: unknown): void => {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: o,
        } as never);
      };
      const fail = (message: string): void => {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: message,
        } as never);
      };
      if (!toolkit || !editor) {
        fail("The editor is not ready yet.");
        return;
      }

      const isWrite = isAiWriteToolName(toolCall.toolName);
      const doc = editor.currentDocument();
      try {
        const before = isWrite
          ? new Set((await readPending(doc)).map((r) => r.id))
          : null;
        const executed = await toolkit.executeTool(
          {
            id: toolCall.toolCallId,
            name: toolCall.toolName,
            args: toolCall.input,
          },
          {
            writeMode:
              editor.getEditorMode() === "review" ? "track_changes" : "apply",
            reviewComments: "create",
          },
        );
        if (before) {
          // Pair this call's new tracked changes with the model's reason.
          const created = newRevisionIds(before, await readPending(doc));
          const rationale = String(
            (toolCall.input as { reviewComment?: string })?.reviewComment ?? "",
          );
          if (created.length > 0) {
            setGroups((g) => [
              ...g.filter(
                (x) => !x.revisionIds.some((id) => created.includes(id)),
              ),
              {
                key: toolCall.toolCallId,
                ruleId: ruleIdOf(rationale),
                rationale,
                revisionIds: created,
                threadId: threadIdOf(executed.result),
              },
            ]);
          }
          await refreshChanges();
        }
        output(executed);
      } catch (e) {
        fail(e instanceof Error ? e.message : String(e));
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    if (!text.trim() || busy || !ready) return;
    sendMessage({ text: text.trim() });
    setInput("");
    setTab("review");
  }

  // One transaction: decide the revisions, then close the agent's comment
  // thread with the verdict so the exported Word file keeps an audit trail.
  async function decide(targets: ChangeGroup[], verdict: "accept" | "reject") {
    const doc = editorRef.current?.currentDocument();
    const ids = targets.flatMap((g) => g.revisionIds);
    if (!doc || ids.length === 0) return;
    const threadIds = new Set(targets.flatMap((g) => g.threadId ?? []));
    await (doc as unknown as TxDocument).transaction(async ({ draft }) => {
      const revisions = draft.revisions();
      if (verdict === "accept") revisions.accept({ ids });
      else revisions.reject({ ids });
      for (const thread of draft.commentThreads().all()) {
        if (!threadIds.has(thread.id)) continue;
        thread.reply(
          verdict === "accept"
            ? "Accepted by reviewer."
            : "Rejected by reviewer.",
        );
        thread.resolve();
      }
      return { commit: true, result: null };
    });
    await refreshChanges();
  }

  async function exportDocx() {
    const doc = editorRef.current?.currentDocument();
    if (!doc) return;
    const buffer = await doc.export({ format: "docx" });
    download(
      buffer,
      `${fileName.replace(/\.docx$/i, "")}-redlined.docx`,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  }

  async function upload(file: File) {
    const system = systemRef.current;
    if (!system) return;
    stop();
    setMessages([]);
    const doc = await system.import(file, { format: "docx" });
    await openDocument(doc);
    setFileName(file.name);
  }

  function toggleTracked(on: boolean) {
    setTracked(on);
    editorRef.current?.setEditorMode(on ? "review" : "edit");
  }

  // One agent edit can be dozens of word-level revisions; count edits.
  const pendingCount = groups.length;
  const agentGroups = groups.filter((g) => !g.key.startsWith("manual-"));

  return (
    <SampleCanvas
      wide
      title="AI Contract Redline"
      description="An AI agent reviews vendor paper against your legal playbook and redlines it as tracked changes, each with a comment citing the rule. You accept or reject every change, then export a Word redline."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Document Authoring SDK", href: "/document-authoring-sdk" },
      ]}
    >
      <div className="acr-wrapper">
        <div
          ref={containerRef}
          // Same as the other DocAuth samples: docauth-host pins the SDK's
          // colour tokens (see globals.css), and the light backdrop sits behind
          // its transparent toolbar in both app themes.
          className="docauth-host acr-editor bg-gray-100 dark:bg-gray-200"
        />

        <aside className="acr-panel" aria-label="Contract agent">
          <div className="acr-tabs" role="tablist">
            {(["review", "changes", "playbook"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`acr-tab${tab === t ? " acr-tab-active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "review"
                  ? "Review"
                  : t === "changes"
                    ? `Changes (${pendingCount})`
                    : "Playbook"}
              </button>
            ))}
          </div>

          {tab === "review" && (
            <>
              <div className="acr-messages" aria-live="polite">
                {messages.length === 0 ? (
                  <div className="acr-intro">
                    <p>
                      <strong>{fileName}</strong> is vendor paper sent to{" "}
                      {CUSTOMER}. Run the playbook review and the agent redlines
                      every clause that breaks one of {CUSTOMER}&apos;s rules,
                      as tracked changes you approve one by one.
                    </p>
                    <button
                      type="button"
                      className="acr-btn acr-btn-primary acr-run"
                      onClick={() => send(RUN_PLAYBOOK)}
                      disabled={!ready || busy}
                    >
                      Review against playbook
                    </button>
                    <p className="acr-hint">
                      Or ask for anything below, e.g. “Add a mutual
                      non-solicitation clause.”
                    </p>
                  </div>
                ) : (
                  messages.map((m) => <Message key={m.id} message={m} />)
                )}
                {busy && <div className="acr-status">Working…</div>}
                {error && (
                  <div className="acr-error" role="alert">
                    {error.message}
                  </div>
                )}
              </div>
              {agentGroups.length > 0 && !busy && (
                <button
                  type="button"
                  className="acr-banner"
                  onClick={() => setTab("changes")}
                >
                  {pendingCount} change{pendingCount === 1 ? "" : "s"} waiting
                  for your review →
                </button>
              )}
              <form
                className="acr-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <textarea
                  className="acr-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={
                    ready
                      ? "Ask the agent to change the contract…"
                      : "Loading contract…"
                  }
                  rows={2}
                  disabled={!ready}
                  aria-label="Ask the contract agent"
                />
                <div className="acr-form-row">
                  <label className="acr-toggle">
                    <input
                      type="checkbox"
                      checked={tracked}
                      onChange={(e) => toggleTracked(e.target.checked)}
                    />
                    Suggest as tracked changes
                  </label>
                  <button
                    type="submit"
                    className="acr-btn acr-btn-primary"
                    disabled={!ready || busy || !input.trim()}
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}

          {tab === "changes" && (
            <div className="acr-changes">
              {groups.length === 0 ? (
                <p className="acr-empty">
                  No pending changes. Run the playbook review to get a redline.
                </p>
              ) : (
                <>
                  <div className="acr-bulk">
                    <button
                      type="button"
                      className="acr-btn"
                      onClick={() => decide(groups, "reject")}
                    >
                      Reject all
                    </button>
                    <button
                      type="button"
                      className="acr-btn acr-btn-primary"
                      onClick={() => decide(groups, "accept")}
                    >
                      Accept all
                    </button>
                  </div>
                  <ul className="acr-change-list">
                    {groups.map((g) => (
                      <li key={g.key} className="acr-change">
                        <div className="acr-change-head">
                          <span
                            className={`acr-rule${g.ruleId ? "" : " acr-rule-manual"}`}
                          >
                            {g.ruleId ?? "Manual"}
                          </span>
                          <span className="acr-change-reason">
                            {g.rationale.replace(/^PB-\d+:\s*/, "")}
                          </span>
                        </div>
                        <ul className="acr-revisions">
                          {mergeRuns(
                            g.revisionIds.flatMap((id) =>
                              previews[id] ? [previews[id]] : [],
                            ),
                          )
                            .filter((run) => run.text)
                            .map((run, i) => (
                              <li
                                // biome-ignore lint/suspicious/noArrayIndexKey: runs are derived and positional
                                key={i}
                                className={`acr-rev acr-rev-${run.type}`}
                              >
                                {run.text}
                              </li>
                            ))}
                        </ul>
                        <div className="acr-change-actions">
                          <button
                            type="button"
                            className="acr-btn"
                            onClick={() => decide([g], "reject")}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="acr-btn acr-btn-primary"
                            onClick={() => decide([g], "accept")}
                          >
                            Accept
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {tab === "playbook" && (
            <div className="acr-playbook">
              <p className="acr-hint">
                The agent enforces these positions. They live on the server, so
                a user can't rewrite them from the browser.
              </p>
              <ol>
                {PLAYBOOK.map((r) => (
                  <li key={r.id}>
                    <span className="acr-rule">{r.id}</span>{" "}
                    <strong>{r.topic}.</strong> {r.standard}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="acr-footer">
            <label className="acr-btn acr-upload">
              Open DOCX…
              <input
                type="file"
                accept=".docx"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              className="acr-btn"
              onClick={exportDocx}
              disabled={!ready}
            >
              Export Word redline
            </button>
          </div>
        </aside>
      </div>
    </SampleCanvas>
  );
}

function Message({ message }: { message: UIMessage }) {
  return (
    <div className={`acr-msg acr-msg-${message.role}`}>
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;
        if (part.type === "text") {
          return message.role === "assistant" ? (
            // No rehype-raw: model output is untrusted, so raw HTML stays inert.
            <div key={key} className="acr-text acr-md">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                disallowedElements={["img"]}
                unwrapDisallowed
              >
                {part.text}
              </ReactMarkdown>
            </div>
          ) : (
            <p key={key} className="acr-text">
              {part.text}
            </p>
          );
        }
        if (part.type.startsWith("tool-") && "state" in part) {
          const name = part.type.slice(5);
          const failed = part.state === "output-error";
          const done = part.state === "output-available";
          const comment =
            "input" in part
              ? (part.input as { reviewComment?: string } | undefined)
                  ?.reviewComment
              : undefined;
          return (
            <div
              key={key}
              className={`acr-tool${isAiWriteToolName(name) ? " acr-tool-write" : ""}${failed ? " acr-tool-failed" : ""}`}
            >
              <span className="acr-tool-name">{name}</span>
              <span className="acr-tool-state">
                {failed ? "failed" : done ? "done" : "running"}
              </span>
              {comment && <div className="acr-tool-detail">{comment}</div>}
              {failed && "errorText" in part && (
                <div className="acr-tool-detail acr-tool-error">
                  {String(part.errorText)}
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
