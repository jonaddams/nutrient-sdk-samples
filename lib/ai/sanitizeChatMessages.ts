import type { UIMessage } from "ai";

/**
 * Trust boundary for the agentic chat routes: the client posts the whole
 * conversation, so drop what it must not control. Only user/assistant
 * messages survive (no injected system prompt), and within them only text,
 * tool, and step-boundary parts (no file parts the provider would fetch).
 */
export function sanitizeChatMessages(messages: UIMessage[]): UIMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      ...m,
      parts: m.parts.filter(
        (p) =>
          p.type === "text" ||
          p.type === "step-start" ||
          p.type.startsWith("tool-"),
      ),
    }));
}
