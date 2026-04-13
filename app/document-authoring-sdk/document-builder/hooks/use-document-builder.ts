"use client";

import { useCallback, useEffect, useRef } from "react";
import type {
  DocAuthDocument,
  ProgrammaticFormatting,
  ProgrammaticSectionContent,
} from "../../types";

export interface ReportSection {
  heading: string;
  body: string;
}

export interface MetricRow {
  metric: string;
  value: string;
}

export interface ReportFormState {
  title: string;
  author: string;
  executiveSummary: string;
  sections: ReportSection[];
  metrics: MetricRow[];
  conclusion: string;
}

export const DEFAULT_FORM_STATE: ReportFormState = {
  title: "Q4 2025 Performance Review",
  author: "Sarah Chen",
  executiveSummary:
    "This report summarizes the key performance metrics and strategic outcomes for Q4 2025. Overall, the quarter exceeded expectations with strong revenue growth and improved customer retention across all segments.",
  sections: [
    {
      heading: "Revenue Analysis",
      body: "Revenue reached $2.4M in Q4, representing an 18% increase over the previous quarter. Growth was driven primarily by enterprise client expansion and the successful launch of the premium tier in October.",
    },
    {
      heading: "Customer Growth",
      body: "Net new customers increased by 340 in Q4, bringing the total active customer base to 2,847. The customer acquisition cost decreased by 12% due to improved referral programs and organic growth channels.",
    },
  ],
  metrics: [
    { metric: "Revenue", value: "$2.4M" },
    { metric: "Growth Rate", value: "+18%" },
    { metric: "Customer Retention", value: "94%" },
  ],
  conclusion:
    "Q4 2025 demonstrated strong execution across all key metrics. The team is well-positioned entering 2026, with a robust pipeline and improving unit economics.",
};

const HEADING_STYLE: Partial<ProgrammaticFormatting> = {
  bold: true,
  fontSize: 14,
  color: "#1F4E79",
};

const TITLE_STYLE: Partial<ProgrammaticFormatting> = {
  bold: true,
  fontSize: 24,
  color: "#1a1a2e",
};

const SUBTITLE_STYLE: Partial<ProgrammaticFormatting> = {
  italic: true,
  fontSize: 11,
  color: "#666666",
};

const TABLE_HEADER_STYLE: Partial<ProgrammaticFormatting> = {
  bold: true,
  fontSize: 11,
};

function addStyledParagraph(
  content: ProgrammaticSectionContent,
  index: number,
  text: string,
  style: Partial<ProgrammaticFormatting>,
): void {
  const paragraph = content.addParagraph(index);
  const textView = paragraph.asTextView();
  const range = textView.setText(text);
  textView.setFormatting(style, range);
}

function addPlainParagraph(
  content: ProgrammaticSectionContent,
  index: number,
  text: string,
): void {
  const paragraph = content.addParagraph(index);
  paragraph.asTextView().setText(text);
}

function addEmptyParagraph(
  content: ProgrammaticSectionContent,
  index: number,
): void {
  const paragraph = content.addParagraph(index);
  paragraph.asTextView().setText("");
}

export function useDocumentBuilder(
  document: DocAuthDocument | null,
  formState: ReportFormState,
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBuilding = useRef(false);

  const buildDocument = useCallback(
    async (state: ReportFormState) => {
      if (!document || isBuilding.current) return;
      isBuilding.current = true;

      try {
        await document.transaction((draft) => {
          const section = draft.body().sections()[0];
          if (!section) return;
          const content = section.content();

          // Clear all existing content
          const blocks = content.blocklevels();
          for (let i = blocks.length - 1; i >= 0; i--) {
            content.removeElement(i);
          }

          let idx = 0;

          // Title
          addStyledParagraph(content, idx++, state.title, TITLE_STYLE);

          // Author and date
          const today = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          addStyledParagraph(
            content,
            idx++,
            `Prepared by ${state.author} \u2022 ${today}`,
            SUBTITLE_STYLE,
          );

          // Spacer
          addEmptyParagraph(content, idx++);

          // Executive Summary
          if (state.executiveSummary) {
            addStyledParagraph(
              content,
              idx++,
              "Executive Summary",
              HEADING_STYLE,
            );
            addPlainParagraph(content, idx++, state.executiveSummary);
            addEmptyParagraph(content, idx++);
          }

          // Dynamic sections
          for (const sec of state.sections) {
            if (sec.heading) {
              addStyledParagraph(content, idx++, sec.heading, HEADING_STYLE);
            }
            if (sec.body) {
              addPlainParagraph(content, idx++, sec.body);
            }
            addEmptyParagraph(content, idx++);
          }

          // Key Metrics table
          if (state.metrics.length > 0) {
            addStyledParagraph(content, idx++, "Key Metrics", HEADING_STYLE);

            const table = content.addTable(idx++);
            // Header row (already exists as first row)
            const headerRow = table.rows()[0] ?? table.addRow();
            const headerCell0 = headerRow.cells()[0] ?? headerRow.addCell();
            const headerCell1 = headerRow.cells()[1] ?? headerRow.addCell();

            const h0 = headerCell0.blocklevels()[0];
            if (h0 && h0.type === "paragraph") {
              const range = h0.asTextView().setText("Metric");
              h0.asTextView().setFormatting(TABLE_HEADER_STYLE, range);
            }
            const h1 = headerCell1.blocklevels()[0];
            if (h1 && h1.type === "paragraph") {
              const range = h1.asTextView().setText("Value");
              h1.asTextView().setFormatting(TABLE_HEADER_STYLE, range);
            }

            // Data rows
            for (const row of state.metrics) {
              const tableRow = table.addRow();
              const cell0 = tableRow.cells()[0] ?? tableRow.addCell();
              const cell1 = tableRow.cells()[1] ?? tableRow.addCell();

              const p0 = cell0.blocklevels()[0];
              if (p0 && p0.type === "paragraph") {
                p0.asTextView().setText(row.metric);
              }
              const p1 = cell1.blocklevels()[0];
              if (p1 && p1.type === "paragraph") {
                p1.asTextView().setText(row.value);
              }
            }

            addEmptyParagraph(content, idx++);
          }

          // Conclusion
          if (state.conclusion) {
            addStyledParagraph(content, idx++, "Conclusion", HEADING_STYLE);
            addPlainParagraph(content, idx++, state.conclusion);
          }
        });
      } catch (error) {
        console.error("❌ Error building document:", error);
      } finally {
        isBuilding.current = false;
      }
    },
    [document],
  );

  // Debounced rebuild on form state changes
  useEffect(() => {
    if (!document) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      buildDocument(formState);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [document, formState, buildDocument]);

  return { buildDocument };
}
