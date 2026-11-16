import { anthropic } from "@ai-sdk/anthropic";
import {
  getAiPromptGuide,
  getAiToolDefinitions,
} from "@nutrient-sdk/document-authoring-ai";
import { toVercelAiTools } from "@nutrient-sdk/document-authoring-ai/vercel";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { REDLINE_INSTRUCTIONS } from "../../playbook";

export const maxDuration = 120;

// Same provider choice as the Web SDK agentic sample: Anthropic directly when
// ANTHROPIC_API_KEY is set, otherwise an AI Gateway model string.
const MODEL = process.env.ANTHROPIC_API_KEY
  ? anthropic(process.env.AGENTIC_EDIT_MODEL ?? "claude-sonnet-5-5")
  : (process.env.AGENTIC_EDIT_MODEL ?? "anthropic/claude-sonnet-5.5");

// Every write tool must carry a reviewComment; the browser turns each into a
// comment thread on the tracked change. Schemas only, no `execute`: the
// browser runs every tool against the live editor.
const tools = toVercelAiTools(
  getAiToolDefinitions({ reviewComments: "create" }),
);
const SYSTEM = `${getAiPromptGuide()}\n\n${REDLINE_INSTRUCTIONS}`;

// Public, unauthenticated endpoint that spends model credits: bound every request.
// ponytail: size caps only, no per-IP rate limit; add BotID or a limiter if abused.
const MAX_MESSAGES = 120;
const MAX_BODY_BYTES = 1_500_000;

export async function POST(req: Request) {
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return Response.json(
      { error: "Conversation too long. Start a new review." },
      { status: 413 },
    );
  }
  let messages: UIMessage[];
  try {
    ({ messages } = JSON.parse(raw));
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES
  ) {
    return Response.json({ error: "Invalid conversation." }, { status: 400 });
  }

  const result = streamText({
    model: MODEL,
    system: SYSTEM,
    // The client must not inject its own system prompt.
    messages: await convertToModelMessages(
      messages.filter((m) => m.role === "user" || m.role === "assistant"),
    ),
    tools,
    maxOutputTokens: 4000,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error("[ai-contract-redline]", error);
        return "The AI model is unavailable right now. Try again in a moment.";
      },
      // The model must keep seeing its own invalid-tool-call errors to recover.
      redactToolErrors: false,
    }),
  });
}
