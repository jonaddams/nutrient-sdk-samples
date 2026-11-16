import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { modelTools, SYSTEM_PROMPT } from "../../tools";

export const maxDuration = 60;

// AI Gateway model string. Override per deployment without a code change.
const MODEL = process.env.AGENTIC_EDIT_MODEL ?? "anthropic/claude-sonnet-5.5";

// Public, unauthenticated endpoint that spends model credits: bound every request.
// ponytail: size caps only, no per-IP rate limit; add BotID or a limiter if the demo is abused.
const MAX_MESSAGES = 80;
const MAX_BODY_BYTES = 400_000;

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json(
      { error: "Conversation too long. Reset the chat." },
      { status: 413 },
    );
  }

  let messages: UIMessage[];
  try {
    ({ messages } = JSON.parse(raw));
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages is required." }, { status: 400 });
  }
  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: "Conversation too long. Reset the chat." },
      { status: 413 },
    );
  }

  // No `execute` on any tool: the stream ends at each tool call, the browser
  // runs it against the editor, and useChat posts the result back here.
  const result = streamText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: modelTools,
    maxOutputTokens: 4000,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Default text is a bare "An error occurred."; keep provider details
      // (billing, quotas) in the server log, out of a prospect's view.
      onError: (error) => {
        console.error("[agentic-content-editing]", error);
        return "The AI model is unavailable right now. Try again in a moment.";
      },
      // The model must keep seeing its own invalid-tool-call errors to recover.
      redactToolErrors: false,
    }),
  });
}
