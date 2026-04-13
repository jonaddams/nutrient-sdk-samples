"use client";

import { useCallback, useEffect, useRef } from "react";
import type { DocAuthEditor, DocAuthSystem } from "../../types";

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

// --- DocJSON helpers ---

type DocJsonRun = {
  type: "r";
  text: string;
  rPr?: Record<string, unknown>;
};

type DocJsonParagraph = {
  type: "p";
  pPr?: Record<string, unknown>;
  elements: DocJsonRun[];
};

type DocJsonTableCell = {
  elements: DocJsonParagraph[];
  tcPr?: Record<string, unknown>;
};

type DocJsonTableRow = {
  cells: DocJsonTableCell[];
};

type DocJsonTable = {
  type: "t";
  rows: DocJsonTableRow[];
};

type DocJsonElement = DocJsonParagraph | DocJsonTable;

function styledParagraph(
  text: string,
  runProps?: Record<string, unknown>,
  paraProps?: Record<string, unknown>,
): DocJsonParagraph {
  return {
    type: "p",
    ...(paraProps ? { pPr: paraProps } : {}),
    elements: [
      {
        type: "r",
        text,
        ...(runProps ? { rPr: runProps } : {}),
      },
    ],
  };
}

function plainParagraph(text: string): DocJsonParagraph {
  return { type: "p", elements: [{ type: "r", text }] };
}

function emptyParagraph(): DocJsonParagraph {
  return { type: "p", elements: [] };
}

function buildDocJson(state: ReportFormState): object {
  const elements: DocJsonElement[] = [];

  // Title
  elements.push(
    styledParagraph(state.title, {
      bold: true,
      pointSize: 24,
      color: "#1a1a2e",
    }),
  );

  // Author and date
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  elements.push(
    styledParagraph(`Prepared by ${state.author} \u2022 ${today}`, {
      italic: true,
      pointSize: 11,
      color: "#666666",
    }),
  );

  elements.push(emptyParagraph());

  // Executive Summary
  if (state.executiveSummary) {
    elements.push(
      styledParagraph("Executive Summary", {
        bold: true,
        pointSize: 14,
        color: "#1F4E79",
      }),
    );
    elements.push(plainParagraph(state.executiveSummary));
    elements.push(emptyParagraph());
  }

  // Dynamic sections
  for (const sec of state.sections) {
    if (sec.heading) {
      elements.push(
        styledParagraph(sec.heading, {
          bold: true,
          pointSize: 14,
          color: "#1F4E79",
        }),
      );
    }
    if (sec.body) {
      elements.push(plainParagraph(sec.body));
    }
    elements.push(emptyParagraph());
  }

  // Key Metrics table
  if (state.metrics.length > 0) {
    elements.push(
      styledParagraph("Key Metrics", {
        bold: true,
        pointSize: 14,
        color: "#1F4E79",
      }),
    );

    const headerRow: DocJsonTableRow = {
      cells: [
        {
          elements: [
            styledParagraph("Metric", { bold: true, pointSize: 11 }),
          ],
        },
        {
          elements: [
            styledParagraph("Value", { bold: true, pointSize: 11 }),
          ],
        },
      ],
    };

    const dataRows: DocJsonTableRow[] = state.metrics.map((row) => ({
      cells: [
        { elements: [plainParagraph(row.metric)] },
        { elements: [plainParagraph(row.value)] },
      ],
    }));

    elements.push({
      type: "t",
      rows: [headerRow, ...dataRows],
    });

    elements.push(emptyParagraph());
  }

  // Conclusion
  if (state.conclusion) {
    elements.push(
      styledParagraph("Conclusion", {
        bold: true,
        pointSize: 14,
        color: "#1F4E79",
      }),
    );
    elements.push(plainParagraph(state.conclusion));
  }

  return {
    type: "https://pspdfkit.com/document-authoring/persistence/container",
    version: 1,
    container: {
      document: {
        body: {
          sections: [
            {
              elements,
            },
          ],
        },
      },
    },
  };
}

export function useDocumentBuilder(
  docAuthSystem: DocAuthSystem | null,
  editor: DocAuthEditor | null,
  formState: ReportFormState,
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBuilding = useRef(false);

  const buildDocument = useCallback(
    async (state: ReportFormState) => {
      if (!docAuthSystem || !editor || isBuilding.current) return;
      isBuilding.current = true;

      try {
        const docJson = buildDocJson(state);
        const newDoc = await docAuthSystem.loadDocument(docJson);
        editor.setCurrentDocument(newDoc);
      } catch (error) {
        console.error("❌ Error building document:", error);
      } finally {
        isBuilding.current = false;
      }
    },
    [docAuthSystem, editor],
  );

  // Debounced rebuild on form state changes
  useEffect(() => {
    if (!docAuthSystem || !editor) return;

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
  }, [docAuthSystem, editor, formState, buildDocument]);

  return { buildDocument };
}
