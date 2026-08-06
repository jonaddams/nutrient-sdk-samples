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
        { id: "google.gemma-3-27b-it", label: "Gemma 3 27B" },
        { id: "qwen.qwen3-vl-235b-a22b-instruct", label: "Qwen3-VL 235B" },
      ],
      defaultModel: "qwen.qwen3-vl-235b-a22b-instruct",
    },
  ],
};

function stubFetch(
  response: Partial<Response> & { json?: () => Promise<unknown> },
) {
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
  expect(providers[1].models[0].label).toBe("Gemma 3 27B");
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
  stubFetch({
    ok: true,
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
  });
  await expect(fetchProviders()).rejects.toThrow(/malformed/i);
});

// Entry-level validation, added 2026-08-06. Previously only the outer array was
// checked, so a malformed entry reached the component and crashed `.models.map`
// — a TypeError inside render instead of the handled "providers failed" state
// this function exists to produce. The backend always sends `models` and both
// sides ship together, so these guard a future divergence, not a live bug.
test("rejects a provider entry with no models array", async () => {
  stubFetch({
    ok: true,
    json: async () => ({
      providers: [{ id: "openai", label: "OpenAI", defaultModel: "gpt-5.4" }],
    }),
  });
  await expect(fetchProviders()).rejects.toThrow("malformed providers response");
});

test("rejects a provider entry with a malformed model", async () => {
  stubFetch({
    ok: true,
    json: async () => ({
      providers: [
        {
          id: "bedrock",
          label: "AWS Bedrock",
          models: [{ id: "qwen.qwen3-vl-235b-a22b-instruct" }], // no label
          defaultModel: "qwen.qwen3-vl-235b-a22b-instruct",
        },
      ],
    }),
  });
  await expect(fetchProviders()).rejects.toThrow("malformed providers response");
});

test("rejects the whole response rather than dropping a bad entry", async () => {
  // Deliberate: filtering would present a shorter list as though it were
  // complete, and "OpenAI is missing" is far worse to debug than "providers
  // failed to load".
  stubFetch({
    ok: true,
    json: async () => ({
      providers: [
        { id: "openai", label: "OpenAI", models: [], defaultModel: "gpt-5.4" },
        { id: "broken", label: "Broken" },
      ],
    }),
  });
  await expect(fetchProviders()).rejects.toThrow("malformed providers response");
});

test("still accepts a well-formed payload, including an empty model list", async () => {
  // The guard must not reject the legitimate single-model-provider shape.
  stubFetch({ ok: true, json: async () => PAYLOAD });
  const providers = await fetchProviders();
  expect(providers).toHaveLength(2);
  expect(providers[0].models).toEqual([]);
  expect(providers[1].models).toHaveLength(2);
});

test("an empty provider list is still a legitimate answer", async () => {
  // "nothing configured" is valid and must not be confused with malformed.
  stubFetch({ ok: true, json: async () => ({ providers: [] }) });
  await expect(fetchProviders()).resolves.toEqual([]);
});
