import { afterEach, expect, test, vi } from "vitest";
import { fetchProviders } from "../providers";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const PAYLOAD = {
  providers: [
    { id: "openai", label: "OpenAI", models: [], defaultModel: "gpt-5.4" },
    {
      id: "bedrock",
      label: "AWS Bedrock",
      models: [
        { id: "amazon.nova-pro-v1:0", label: "Nova Pro" },
        { id: "qwen.qwen3-vl-235b-a22b", label: "Qwen3-VL 235B" },
      ],
      defaultModel: "qwen.qwen3-vl-235b-a22b",
    },
  ],
};

function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(String(url));
      return response;
    }) as unknown as typeof fetch,
  );
  return calls;
}

test("requests the providers endpoint", async () => {
  const calls = stubFetch({ ok: true, json: async () => PAYLOAD });
  await fetchProviders();
  expect(calls[0]).toContain("/api/extraction/providers");
});

test("returns the provider list", async () => {
  stubFetch({ ok: true, json: async () => PAYLOAD });
  const providers = await fetchProviders();
  expect(providers.map((p) => p.id)).toEqual(["openai", "bedrock"]);
  expect(providers[1].models[0].label).toBe("Nova Pro");
});

test("throws on a non-ok response", async () => {
  stubFetch({ ok: false, status: 503, json: async () => ({}) });
  await expect(fetchProviders()).rejects.toThrow("503");
});

test("an empty provider list resolves rather than throwing", async () => {
  // Empty is a legitimate answer — a deployment with no credentials configured.
  // Only a body *without* a providers array means the backend is broken, so this
  // must not be conflated with the malformed case below.
  stubFetch({ ok: true, json: async () => ({ providers: [] }) });
  await expect(fetchProviders()).resolves.toEqual([]);
});

test("throws when the body has no providers array", async () => {
  // A backend that answers with something unexpected must not surface as an
  // empty dropdown, which would read as "no providers configured".
  stubFetch({ ok: true, json: async () => ({ nope: true }) });
  await expect(fetchProviders()).rejects.toThrow(/malformed/i);
});

test("throws when the body is invalid JSON", async () => {
  // Invalid JSON is indistinguishable from a malformed response shape from the
  // caller's perspective — both mean the backend is broken.
  stubFetch({ ok: true, json: async () => {
    throw new SyntaxError("Unexpected token");
  } });
  await expect(fetchProviders()).rejects.toThrow(/malformed/i);
});
