/**
 * Acme Corporation's contract playbook: the positions its legal team requires
 * on vendor paper. Shared by the server (injected into the system prompt, so
 * a client can't rewrite the rules) and the browser (shown in the sidebar).
 */
export type PlaybookRule = {
  id: string;
  topic: string;
  standard: string;
};

export const CUSTOMER = "Acme Corporation";

export const PLAYBOOK: readonly PlaybookRule[] = [
  {
    id: "PB-1",
    topic: "Payment terms",
    standard:
      "Customer pays within forty-five (45) days of receiving a valid invoice.",
  },
  {
    id: "PB-2",
    topic: "Late fees",
    standard: "Late interest may not exceed one percent (1%) per month.",
  },
  {
    id: "PB-3",
    topic: "Renewal notice",
    standard:
      "Auto-renewal is allowed only if Customer can opt out with thirty (30) days' notice.",
  },
  {
    id: "PB-4",
    topic: "Termination for convenience",
    standard:
      "Customer may terminate for convenience on thirty (30) days' written notice.",
  },
  {
    id: "PB-5",
    topic: "Confidentiality",
    standard:
      "Confidentiality obligations survive at least three (3) years after the agreement ends.",
  },
  {
    id: "PB-6",
    topic: "Breach notification",
    standard:
      "Vendor notifies Customer of a security breach within seventy-two (72) hours of discovery.",
  },
  {
    id: "PB-7",
    topic: "Liability cap",
    standard:
      "Liability cap is no less than the fees paid in the twelve (12) months before the claim.",
  },
  {
    id: "PB-8",
    topic: "Governing law",
    standard: "Governed by the laws of the State of Delaware.",
  },
];

export const AGENT_AUTHOR = "Contract Agent";

/** Host instructions layered on top of the toolkit's own prompt guide. */
export const REDLINE_INSTRUCTIONS = `You are ${AGENT_AUTHOR}, reviewing a contract on behalf of ${CUSTOMER} against its playbook.

Playbook (the positions ${CUSTOMER} requires):
${PLAYBOOK.map((r) => `- ${r.id} ${r.topic}: ${r.standard}`).join("\n")}

How to redline:
- Read the whole document before editing.
- Fix only clauses that conflict with a playbook rule. Leave compliant clauses untouched, and don't polish wording the playbook doesn't cover.
- Make the smallest edit that brings the clause into line: prefer replace_text over rewriting a paragraph. Keep the contract's drafting style, for example "forty-five (45) days".
- If a required right is missing entirely (no clause to edit), add one short sentence to the most relevant section.
- Any edit gives the edited paragraph a new id. When one paragraph breaks two rules, call search_elements for it again before the second edit, instead of reusing the id you read earlier.
- Every reviewComment cites the rule, then says what changed and why, in one sentence. Example: "PB-1: payment terms extended from 15 to 45 days to meet Acme's standard."
- Your edits are suggestions for a human reviewer, who accepts or rejects each one. Never say the contract is final.

When you finish, list the rules you applied and the ones that were already compliant.`;
