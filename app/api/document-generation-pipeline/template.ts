export interface MergeValues {
  clientName: string;
  providerName: string;
  feePerMonth: string;
  effectiveDate: string;
}

export interface Signer {
  token: string;
  fieldName: string;
  label: string;
}

/**
 * Each signer is anchored in the HTML by a single uppercase, underscore-free
 * token. The DWS text tokenizer strips `_` and punctuation, so the rendered
 * token must already be a single alphanumeric word for exact-match location
 * and text redaction to work.
 */
export const SIGNERS: Signer[] = [
  {
    token: "SIGNATURECLIENT",
    fieldName: "signatureClient",
    label: "Client Signature",
  },
  {
    token: "SIGNATUREPROVIDER",
    fieldName: "signatureProvider",
    label: "Provider Signature",
  },
];

export const DEFAULT_VALUES: MergeValues = {
  clientName: "Acme Corporation",
  providerName: "Nutrient Services LLC",
  feePerMonth: "5,000",
  effectiveDate: "January 1, 2026",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function mergeTemplate(values: MergeValues): string {
  const clientName = escapeHtml(values.clientName);
  const providerName = escapeHtml(values.providerName);
  const feePerMonth = escapeHtml(values.feePerMonth);
  const effectiveDate = escapeHtml(values.effectiveDate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; margin: 64px; }
  h1 { font-size: 22pt; margin-bottom: 4px; }
  .subtitle { color: #666; margin-top: 0; }
  .clause { margin: 18px 0; }
  .sig-grid { margin-top: 96px; display: flex; gap: 64px; }
  .sig-block { flex: 1; }
  .sig-anchor { font-size: 11pt; color: #1a1a1a; }
  .sig-caption { border-top: 1px solid #1a1a1a; margin-top: 56px; padding-top: 6px; color: #444; font-size: 10pt; }
</style>
</head>
<body>
  <h1>Mutual Services Agreement</h1>
  <p class="subtitle">Effective ${effectiveDate}</p>

  <p class="clause">This Mutual Services Agreement (the "Agreement") is entered into between
    <strong>${clientName}</strong> ("Client") and <strong>${providerName}</strong> ("Provider")
    as of ${effectiveDate}.</p>

  <p class="clause"><strong>1. Services.</strong> Provider will deliver the services described in
    the applicable statement of work.</p>
  <p class="clause"><strong>2. Term.</strong> This Agreement remains in effect for twelve (12) months
    from the effective date and renews by mutual written agreement.</p>
  <p class="clause"><strong>3. Fees.</strong> Client will pay Provider a fee of $${feePerMonth} per month,
    payable within thirty (30) days of each invoice.</p>
  <p class="clause"><strong>4. Governing Law.</strong> This Agreement is governed by the laws of the
    State of Delaware.</p>

  <div class="sig-grid">
    <div class="sig-block">
      <p class="sig-anchor">SIGNATURECLIENT</p>
      <p class="sig-caption">Client Signature &mdash; ${clientName}</p>
    </div>
    <div class="sig-block">
      <p class="sig-anchor">SIGNATUREPROVIDER</p>
      <p class="sig-caption">Provider Signature &mdash; ${providerName}</p>
    </div>
  </div>
</body>
</html>`;
}
