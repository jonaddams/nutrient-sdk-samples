// Long-form report DocJSON used to demo click-to-scroll. Headings are
// styled inline (bold + larger pointSize) so the runtime can detect them
// via the Programmatic API's formatting() — the SDK does not expose a
// "Heading 1/2" named-style concept on Paragraph (as of 1.12.0).

type Run = { type: "r"; text: string; rPr?: Record<string, unknown> };
type Para = { type: "p"; pPr?: Record<string, unknown>; elements: Run[] };
type Element = Para;

const TITLE_RUN = { bold: true, pointSize: 28, color: "#1a1a2e" } as const;
const H1_RUN = { bold: true, pointSize: 22, color: "#1F4E79" } as const;
const H2_RUN = { bold: true, pointSize: 16, color: "#2E5984" } as const;

const title = (text: string): Para => ({
  type: "p",
  elements: [{ type: "r", text, rPr: { ...TITLE_RUN } }],
});
const h1 = (text: string): Para => ({
  type: "p",
  elements: [{ type: "r", text, rPr: { ...H1_RUN } }],
});
const h2 = (text: string): Para => ({
  type: "p",
  elements: [{ type: "r", text, rPr: { ...H2_RUN } }],
});
const p = (text: string): Para => ({
  type: "p",
  elements: [{ type: "r", text }],
});
const empty = (): Para => ({ type: "p", elements: [] });

const elements: Element[] = [
  title("Q1 2026 Engineering Report"),
  p(
    "Prepared by the Platform team • Distributed to all engineering and product leadership.",
  ),
  empty(),

  h1("Executive Summary"),
  p(
    "Q1 was a stabilization quarter following the December launch of the new ingestion pipeline. The team prioritized reliability and observability over new feature work, and the results show: incident count fell by 41% quarter-over-quarter, mean time to detect dropped from 18 minutes to under 6, and we shipped four foundational improvements that unblock the H1 roadmap.",
  ),
  p(
    "The remainder of this report breaks down what we built, what we learned, and what's coming next. Where relevant we've included the metrics that drove specific decisions so future readers can audit the reasoning.",
  ),
  empty(),

  h1("Platform Reliability"),
  p(
    "Reliability work this quarter focused on the three subsystems flagged in the December postmortem: the ingestion queue, the document conversion workers, and the cross-region replication layer. Each had a different root cause and a different mitigation strategy.",
  ),
  h2("Ingestion queue"),
  p(
    "We migrated from the bespoke at-least-once queue to the platform-managed durable queue. This eliminated a class of duplicate-delivery bugs that had accumulated over two years and reduced operational toil. The migration ran in shadow mode for three weeks before cutover; we captured 14 latent correctness issues during shadow that would have surfaced as production incidents under the old system.",
  ),
  h2("Conversion workers"),
  p(
    "The conversion worker pool was rebuilt to use Fluid Compute, which reduced cold starts from a p99 of 2.4 seconds to under 200 milliseconds. We also added per-tenant rate limiting at the worker boundary, replacing the API-gateway approach that couldn't see queue depth.",
  ),
  h2("Cross-region replication"),
  p(
    "Replication lag during peak hours had been creeping up since November. We traced the issue to a write-amplification pattern in our compaction strategy and shipped a fix that reduced replication-related I/O by roughly 60%. Lag is now consistently under five seconds at p99, down from a peak of forty.",
  ),
  empty(),

  h1("Performance Improvements"),
  p(
    "Beyond the reliability work, two performance projects landed this quarter: the response-time work in the document API, and the bundle-size reductions in the embeddable viewer.",
  ),
  h2("Document API latency"),
  p(
    "The document API's p95 dropped from 480ms to 190ms after we introduced a request-coalescing layer at the edge. Coalescing was straightforward to implement on top of the existing cache invalidation primitives, but careful tuning was required to avoid stampedes during cache misses.",
  ),
  h2("Viewer bundle size"),
  p(
    "We reduced the embeddable viewer's initial JS payload by 38% via aggressive code-splitting and by moving the rarely-used annotation toolbar behind a dynamic import. Time-to-interactive on a cold load improved from 2.1s to 1.3s on a representative mid-tier mobile device.",
  ),
  empty(),

  h1("Customer Impact"),
  p(
    "Customer-facing improvements were less visible this quarter, by design. The reliability and performance work did show up in support metrics: ticket volume related to slow loads or upload failures fell by 27%, and we resolved two long-standing top-five customer asks during the dependency upgrades.",
  ),
  p(
    "The largest enterprise customer's renewal review cited platform stability and per-tenant throughput as decisive factors. They expanded usage by 3.2x in March alone, which is a useful pressure-test of the new queue architecture.",
  ),
  empty(),

  h1("Team Updates"),
  p(
    "Three engineers joined the team during Q1: two on the platform side and one on the SDK side. Onboarding ramp time averaged 11 days to first production change, slightly faster than the team's historical average. The new SDK engineer led the bundle-size project end-to-end, which validated the new pairing rotation.",
  ),
  p(
    "We also rotated on-call ownership of the conversion workers from the platform team to the SDK team, as part of the ongoing effort to align on-call burden with active development. The handoff went smoothly; SDK now owns the on-call burden roughly proportional to their commit volume in that subsystem.",
  ),
  empty(),

  h1("Looking Ahead"),
  p(
    "Q2 will be a feature-forward quarter. With the foundational work complete, the team is positioned to ship the multi-tenant rate-limit dashboard, the redesigned upload pipeline, and the first phase of the new SDK 2.0 surface. The detailed Q2 roadmap will be published next week.",
  ),
  p(
    "If you have questions, comments, or want to dig into any of the metrics referenced above, the team holds office hours every Thursday at 3pm. The dashboards mentioned in this report are linked from the team wiki.",
  ),
];

export const SAMPLE_DOC_JSON = {
  type: "https://pspdfkit.com/document-authoring/persistence/container",
  version: 1,
  container: {
    document: {
      body: {
        sections: [{ elements }],
      },
    },
  },
} as const;
