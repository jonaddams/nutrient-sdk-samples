"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import {
  PRESET_AUTHORS,
  type Author,
  type CommentThread,
} from "./viewer";
import "./styles.css";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

const DISPLAY_MODES = ["FITTING", "FLOATING", "POPOVER"] as const;

function getAuthorColor(authorName: string): string {
  const preset = PRESET_AUTHORS.find((a) => a.name === authorName);
  return preset?.color ?? "#888";
}

function getAuthorInitial(authorName: string): string {
  return authorName.charAt(0).toUpperCase();
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CollaborationCommentsPage() {
  const [activeAuthor, setActiveAuthor] = useState<Author>(PRESET_AUTHORS[0]);
  const [displayMode, setDisplayMode] = useState<string>("FITTING");
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [customName, setCustomName] = useState("");
  const navigateToThreadRef = useRef<((rootId: string) => void) | null>(null);

  const handleThreadsChanged = useCallback((newThreads: CommentThread[]) => {
    setThreads(newThreads);
  }, []);

  const handleCustomNameSubmit = () => {
    const name = customName.trim();
    if (!name) return;
    setActiveAuthor({ id: "custom", name, email: "", color: "#888" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Collaboration Comments"
        description="Switch between authors to add threaded comments with @mentions. Toggle display modes to compare Fitting, Floating, and Popover comment layouts. Use the comment tool in the toolbar to place comments on the document."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="collab-wrapper">
            {/* Sidebar */}
            <div className="collab-sidebar">
              {/* Author Switcher */}
              <div className="collab-section">
                <div className="collab-label">Active Author</div>
                <div className="collab-authors">
                  {PRESET_AUTHORS.map((author) => (
                    <button
                      key={author.id}
                      type="button"
                      className={`collab-avatar ${activeAuthor.id === author.id ? "collab-avatar-active" : ""}`}
                      style={{ backgroundColor: author.color, color: author.color }}
                      onClick={() => {
                        setActiveAuthor(author);
                        setCustomName("");
                      }}
                      title={author.name}
                    >
                      <span style={{ color: "white" }}>{author.name.charAt(0)}</span>
                    </button>
                  ))}
                </div>
                <div className="collab-author-name" style={{ color: activeAuthor.color }}>
                  {activeAuthor.name}
                </div>
                {activeAuthor.email && (
                  <div className="collab-author-email">{activeAuthor.email}</div>
                )}
                <input
                  type="text"
                  className="collab-custom-input"
                  placeholder="Or type a custom name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCustomNameSubmit();
                  }}
                  onBlur={handleCustomNameSubmit}
                />
              </div>

              {/* Display Mode */}
              <div className="collab-section">
                <div className="collab-label">Display Mode</div>
                <div className="collab-display-modes">
                  {DISPLAY_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`collab-display-btn ${displayMode === mode ? "collab-display-btn-active" : ""}`}
                      onClick={() => setDisplayMode(mode)}
                    >
                      {mode.charAt(0) + mode.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toolbar Hint */}
              <div className="collab-hint">
                Use the <strong>comment tool</strong> (💬) in the toolbar to add
                comments. Type <strong>@</strong> in a comment to mention another
                author.
              </div>

              {/* Comment Threads */}
              <div className="collab-section" style={{ flex: 1, minHeight: 0 }}>
                <div className="collab-label">
                  Comment Threads
                  <span className="collab-count">{threads.length}</span>
                </div>
                {threads.length === 0 ? (
                  <div className="collab-empty">
                    No comments yet. Use the comment tool in the toolbar to add one.
                  </div>
                ) : (
                  <div className="collab-threads">
                    {threads.map((thread) => (
                      <button
                        key={thread.rootId}
                        type="button"
                        className="collab-thread-card"
                        style={{ borderLeftColor: getAuthorColor(thread.authorName) }}
                        onClick={() => navigateToThreadRef.current?.(thread.rootId)}
                      >
                        <div className="collab-thread-header">
                          <div
                            className="collab-thread-avatar"
                            style={{ backgroundColor: getAuthorColor(thread.authorName) }}
                          >
                            {getAuthorInitial(thread.authorName)}
                          </div>
                          <span className="collab-thread-author">{thread.authorName}</span>
                          <span className="collab-thread-time">
                            {formatTimeAgo(thread.createdAt)}
                          </span>
                        </div>
                        <div className="collab-thread-text">{thread.text}</div>
                        {thread.replyCount > 0 && (
                          <div className="collab-thread-replies">
                            {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Viewer */}
            <section className="collab-viewer-container">
              <Viewer
                activeAuthor={activeAuthor}
                displayMode={displayMode}
                onThreadsChanged={handleThreadsChanged}
                navigateToThreadRef={navigateToThreadRef}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
