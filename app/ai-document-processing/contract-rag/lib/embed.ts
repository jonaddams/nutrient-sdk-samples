import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Two interchangeable embedders, picked by CONTRACT_RAG_EMBEDDINGS:
 *   local  (default) transformers.js, Xenova/bge-small-en-v1.5. No API key; each
 *          cold instance downloads ~33 MB from huggingface.co.
 *   openai text-embedding-3-small via OPENAI_API_KEY. No native modules and no
 *          model download, so it is the fallback if Hugging Face is down.
 * They embed into different vector spaces, so each has its own index file and
 * the index script and the API route MUST use the same provider.
 */
export type Provider = "local" | "openai";

export const activeProvider = (): Provider =>
  process.env.CONTRACT_RAG_EMBEDDINGS === "openai" ? "openai" : "local";

const LOCAL_MODEL = "Xenova/bge-small-en-v1.5";
const LOCAL_QUERY_PREFIX =
  "Represent this sentence for searching relevant passages: ";
const OPENAI_MODEL = "text-embedding-3-small";
const OPENAI_DIMENSIONS = 512; // shortened from 1536 to keep the index ~2 MB

let extractor: Promise<FeatureExtractionPipeline> | null = null;

async function local(texts: string[]): Promise<number[][]> {
  // Imported lazily so OpenAI mode never loads the ONNX runtime or sharp.
  extractor ??= import("@huggingface/transformers").then(
    ({ env, pipeline }) => {
      // The default cache sits inside node_modules, read-only on Vercel.
      env.cacheDir = join(tmpdir(), "transformers-cache");
      return pipeline("feature-extraction", LOCAL_MODEL, { dtype: "q8" });
    },
  );
  const out = await (await extractor)(texts, {
    pooling: "cls",
    normalize: true,
  });
  return out.tolist() as number[][];
}

async function openai(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set.");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: texts,
      dimensions: OPENAI_DIMENSIONS,
    }),
  });
  if (!res.ok)
    throw new Error(
      `OpenAI embeddings: HTTP ${res.status} ${await res.text()}`,
    );
  const { data } = (await res.json()) as {
    data: { index: number; embedding: number[] }[];
  };
  return data
    .sort((a, b) => a.index - b.index)
    .map(({ embedding: v }) => {
      const norm = Math.hypot(...v); // topK takes dot products, so normalize
      return v.map((x) => x / norm);
    });
}

export const embedPassages = (texts: string[], p: Provider) =>
  p === "openai" ? openai(texts) : local(texts);

export const embedQuery = async (q: string, p: Provider) =>
  (p === "openai"
    ? await openai([q])
    : await local([LOCAL_QUERY_PREFIX + q]))[0];
