import Anthropic from "@anthropic-ai/sdk";
import index from "../../data/index.json";
import { type Chunk, topK } from "../../lib/chunk";
import { docById } from "../../lib/corpus";
import { embedQuery } from "../../lib/embed";

export const maxDuration = 60;

const MODEL = process.env.CONTRACT_RAG_MODEL ?? "claude-sonnet-5-5";
const TOP_K = 5;
const MAX_QUESTION = 400;

// Identical for both pipelines: the comparison is only fair if ingestion is the
// one thing that differs. (No temperature: Sonnet/Haiku 5.5 reject it.)
const SYSTEM =
  'You answer questions about a set of contracts. Answer only from the provided search results, concisely. If the answer is not in them, reply exactly: "Not found in these documents."';

type Indexed = Chunk & { v: number[] };
const INDEXES = index as unknown as Record<"naive" | "parsed", Indexed[]>;

let client: Anthropic | null = null;

export type Segment = { text: string; cites: string[] };
export type AskResponse = {
  segments: Segment[];
  sources: Record<string, Omit<Chunk, "text"> & { title: string }>;
  retrieved: {
    id: string;
    doc: string;
    page: number;
    score: number;
    text: string;
  }[];
};

// Public, unauthenticated endpoint that spends model credits.
// ponytail: input size cap only, no per-IP rate limit; add BotID or a limiter if abused.
export async function POST(req: Request) {
  let body: { question?: unknown; pipeline?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const { question, pipeline } = body;
  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.length > MAX_QUESTION
  ) {
    return Response.json(
      { error: `question must be 1-${MAX_QUESTION} characters.` },
      { status: 400 },
    );
  }
  if (pipeline !== "naive" && pipeline !== "parsed") {
    return Response.json(
      { error: 'pipeline must be "naive" or "parsed".' },
      { status: 400 },
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const top = topK(await embedQuery(question), INDEXES[pipeline], TOP_K);
  const title = (c: Chunk) =>
    `${docById(c.doc)?.title ?? c.doc}, page ${c.page + 1}`;

  client ??= new Anthropic();
  let msg: Anthropic.Message;
  try {
    msg = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...top.map(({ item }) => ({
              type: "search_result" as const,
              source: item.id,
              title: title(item),
              content: [{ type: "text" as const, text: item.text }],
              citations: { enabled: true },
            })),
            { type: "text" as const, text: question },
          ],
        },
      ],
    });
  } catch (e) {
    console.error("contract-rag: model call failed", e);
    return Response.json(
      { error: "The model call failed. Try again." },
      { status: 502 },
    );
  }

  const segments: Segment[] = msg.content.flatMap((b) =>
    b.type === "text"
      ? [
          {
            text: b.text,
            cites: [
              ...new Set(
                (b.citations ?? []).flatMap((c) =>
                  c.type === "search_result_location" ? [c.source] : [],
                ),
              ),
            ],
          },
        ]
      : [],
  );

  const sources: AskResponse["sources"] = {};
  for (const { item } of top) {
    const { v: _v, text: _t, ...rest } = item;
    sources[item.id] = { ...rest, title: title(item) };
  }

  return Response.json({
    segments,
    sources,
    retrieved: top.map(({ item, score }) => ({
      id: item.id,
      doc: item.doc,
      page: item.page,
      score: Math.round(score * 1000) / 1000,
      text: item.text,
    })),
  } satisfies AskResponse);
}
