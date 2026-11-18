/**
 * The deal room: six real commercial contracts from CUAD v1 (Contract
 * Understanding Atticus Dataset, CC BY 4.0, https://www.atticusprojectai.org/cuad),
 * originally filed with the SEC on EDGAR.
 *
 * `understandPages` (1-based) are re-parsed in DWS `understand` mode and spliced
 * over the cheaper `structure` parse: `structure` OCRs fine but mangles dense
 * grids, which `understand` reconstructs cell for cell (spike, 2026-11-18).
 */
export const CORPUS = [
  {
    id: "principal",
    file: "principal-broker-dealer-agreement.pdf",
    title: "Principal Life: Broker Dealer Marketing & Servicing Agreement",
    understandPages: [10, 11, 12, 13], // scanned commission + chargeback schedules
  },
  {
    id: "energyxxi",
    file: "energy-xxi-transportation-agreement.pdf",
    title: "Energy XXI: Crude Petroleum Transportation Agreement",
    understandPages: [23, 24], // Exhibit B gravity differential grid
  },
  {
    id: "armstrong",
    file: "armstrong-flooring-ip-agreement.pdf",
    title: "Armstrong Flooring: Intellectual Property Agreement",
    understandPages: [19, 20], // Schedule 1.1(e) patent schedule
  },
  {
    id: "federated",
    file: "federated-services-agreement.pdf",
    title: "Federated: Services Agreement (2004)",
    understandPages: [],
  },
  {
    id: "federated-amend1",
    file: "federated-services-agreement-amendment-1.pdf",
    title: "Federated: Amendment to Services Agreement (2009)",
    understandPages: [],
  },
  {
    id: "federated-amend2",
    file: "federated-services-agreement-amendment-2.pdf",
    title: "Federated: Second Amendment to Services Agreement (2016)",
    understandPages: [],
  },
] as const;

export type DocId = (typeof CORPUS)[number]["id"];

export const docById = (id: string) => CORPUS.find((d) => d.id === id);

/**
 * Preset questions. Each was run 5x through both pipelines before shipping and
 * kept only if plain-text extraction failed 5/5 while Nutrient parsing answered
 * 5/5 (the last one is the control: both must refuse). Reword one and you must
 * re-run that check; small wording changes flipped results in the spike.
 *
 * Dropped on re-verification: the Energy XXI gravity-grid question. pdf.js
 * emits that grid row by row, so plain text answered it 5/5. Don't bring it
 * back by swapping in a weaker baseline extractor; that would rig the demo.
 */
export const PRESET_QUESTIONS = [
  {
    label: "Chargeback in month 4",
    why: "Scanned page: no text layer",
    question:
      "What percentage of commission is charged back if a Principal variable annuity is surrendered in the 4th completed month?",
  },
  {
    label: "Option B commission, age 76+",
    why: "Scanned table, two-level header",
    question:
      "In the Principal commissions on premium table, what new premium commission percentage applies to Option B for ages 76 and older?",
  },
  {
    label: "VA Exchange chargeback",
    why: "Scanned page: no text layer",
    question:
      "Under the VA Exchange Offer, what percentage of commission is charged back for a Principal surrender in completed months 25 through 36?",
  },
  {
    label: "Chinese patent issue date",
    why: "Patent schedule with blank cells",
    question:
      "On the Arizona Assigned Patents schedule, what is the issue date of Chinese patent 104245258?",
  },
  {
    label: "Australian patent issue date",
    why: "Patent schedule with blank cells",
    question:
      "What is the issue date of Australian patent 2014274549 on the Arizona Assigned Patents schedule?",
  },
  {
    label: "NDA indemnification cap",
    why: "Not in these documents: both should refuse",
    question: "What is the indemnification cap in the mutual NDA?",
  },
] as const;
