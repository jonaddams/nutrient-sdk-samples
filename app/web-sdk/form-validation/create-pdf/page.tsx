"use client";

import { useEffect, useRef, useState } from "react";
import type { Instance } from "@nutrient-sdk/viewer";

export default function CreatePDFPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading SDK...");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    // Unload any existing instance first (handles React Strict Mode double mount)
    try {
      NutrientViewer.unload(container);
    } catch {
      // Ignore errors if no instance exists
    }

    NutrientViewer.load({
      container,
      document: "/blank.pdf",
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
    }).then(async (instance: Instance) => {
      setStatus("Creating form fields...");

      const List = NutrientViewer.Immutable.List as unknown as new (
        items: any[],
      ) => any;

      // ---------------------------------------------------------------
      // Helper functions for creating form field + widget pairs
      // ---------------------------------------------------------------

      const createTextField = async (
        name: string,
        pageIndex: number,
        boundingBox: {
          left: number;
          top: number;
          width: number;
          height: number;
        },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.TextFormField({
          name,
          annotationIds: new List([id]),
        });
        await instance.create([widget, formField]);
      };

      const createDateField = async (
        name: string,
        pageIndex: number,
        boundingBox: {
          left: number;
          top: number;
          width: number;
          height: number;
        },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.TextFormField({
          name,
          annotationIds: new List([id]),
          additionalActions: {
            onFormat: new NutrientViewer.Actions.JavaScriptAction({
              script: 'AFDate_FormatEx("mm/dd/yyyy")',
            }),
          },
        });
        await instance.create([widget, formField]);
      };

      const createCheckbox = async (
        name: string,
        pageIndex: number,
        boundingBox: {
          left: number;
          top: number;
          width: number;
          height: number;
        },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.CheckBoxFormField({
          name,
          annotationIds: new List([id]),
        });
        await instance.create([widget, formField]);
      };

      const createRadioGroup = async (
        name: string,
        options: string[],
        pageIndex: number,
        startLeft: number,
        top: number,
        spacing: number,
      ) => {
        const ids: string[] = [];
        const widgets: any[] = [];
        for (let i = 0; i < options.length; i++) {
          const id = NutrientViewer.generateInstantId();
          ids.push(id);
          widgets.push(
            new NutrientViewer.Annotations.WidgetAnnotation({
              id,
              pageIndex,
              boundingBox: new NutrientViewer.Geometry.Rect({
                left: startLeft + i * spacing,
                top,
                width: 15,
                height: 15,
              }),
              formFieldName: name,
            }),
          );
        }
        const formField = new NutrientViewer.FormFields.RadioButtonFormField({
          name,
          annotationIds: new List(ids),
          options: new List(options),
        });
        await instance.create([...widgets, formField]);
      };

      const createComboBox = async (
        name: string,
        options: string[],
        pageIndex: number,
        boundingBox: {
          left: number;
          top: number;
          width: number;
          height: number;
        },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.ComboBoxFormField({
          name,
          annotationIds: new List([id]),
          options: new List(
            options.map(
              (o) => new NutrientViewer.FormOption({ label: o, value: o }),
            ),
          ),
        });
        await instance.create([widget, formField]);
      };

      const createListBox = async (
        name: string,
        options: string[],
        pageIndex: number,
        boundingBox: {
          left: number;
          top: number;
          width: number;
          height: number;
        },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.ListBoxFormField({
          name,
          annotationIds: new List([id]),
          options: new List(
            options.map(
              (o) => new NutrientViewer.FormOption({ label: o, value: o }),
            ),
          ),
        });
        await instance.create([widget, formField]);
      };

      const createSignature = async (
        name: string,
        pageIndex: number,
        boundingBox: {
          left: number;
          top: number;
          width: number;
          height: number;
        },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.SignatureFormField({
          name,
          annotationIds: new List([id]),
        });
        await instance.create([widget, formField]);
      };

      const createButton = async (
        name: string,
        label: string,
        pageIndex: number,
        boundingBox: {
          left: number;
          top: number;
          width: number;
          height: number;
        },
      ) => {
        const id = NutrientViewer.generateInstantId();
        const widget = new NutrientViewer.Annotations.WidgetAnnotation({
          id,
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          formFieldName: name,
        });
        const formField = new NutrientViewer.FormFields.ButtonFormField({
          name,
          annotationIds: new List([id]),
          buttonLabel: label,
        });
        await instance.create([widget, formField]);
      };

      const createLabel = async (
        text: string,
        pageIndex: number,
        boundingBox: {
          left: number;
          top: number;
          width: number;
          height: number;
        },
        options?: { fontSize?: number; color?: string; bold?: boolean },
      ) => {
        const fontSize = options?.fontSize ?? 9;
        const color = options?.color ?? "#333333";
        const annotation = new NutrientViewer.Annotations.TextAnnotation({
          pageIndex,
          boundingBox: new NutrientViewer.Geometry.Rect(boundingBox),
          text: { format: "plain", value: text },
          fontSize,
          font: "Helvetica",
          color: NutrientViewer.Color.fromHex(color),
          backgroundColor: NutrientViewer.Color.fromHex("#FFFFFF"),
          borderWidth: 0,
        });
        await instance.create(annotation);
      };

      // ---------------------------------------------------------------
      // Page layout: US Letter page (612 x 792 points)
      // Two-column grid with section headers and field labels
      // ---------------------------------------------------------------

      const pageIndex = 0;
      const leftCol = 50;
      const rightCol = 320;
      const fieldW = 230;
      const fieldH = 22;
      const labelH = 12;
      const labelOffset = 14; // labels sit above the field
      let y = 60;

      // --- Title ---
      await createLabel(
        "Account Registration Form",
        pageIndex,
        { left: 50, top: 20, width: 512, height: 28 },
        { fontSize: 18, color: "#111111" },
      );

      // ---------------------------------------------------------------
      // Section 1: Personal Information
      // ---------------------------------------------------------------
      await createLabel(
        "Personal Information",
        pageIndex,
        { left: leftCol, top: y - 2, width: 200, height: 14 },
        { fontSize: 11, color: "#1a1a1a" },
      );
      y += 20;

      // Row 1: Full Name, Email
      await createLabel("Full Name *", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      await createLabel("Email *", pageIndex, {
        left: rightCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      y += labelOffset;
      await createTextField("full_name", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: fieldH,
      });
      await createTextField("email", pageIndex, {
        left: rightCol,
        top: y,
        width: fieldW,
        height: fieldH,
      });
      y += fieldH + 12;

      // Row 2: Phone, Date of Birth
      await createLabel("Phone", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      await createLabel("Date of Birth (mm/dd/yyyy)", pageIndex, {
        left: rightCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      y += labelOffset;
      await createTextField("phone", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: fieldH,
      });
      await createDateField("date_of_birth", pageIndex, {
        left: rightCol,
        top: y,
        width: fieldW,
        height: fieldH,
      });
      y += fieldH + 20;

      // ---------------------------------------------------------------
      // Section 2: Account Details
      // ---------------------------------------------------------------
      await createLabel(
        "Account Details",
        pageIndex,
        { left: leftCol, top: y, width: 200, height: 14 },
        { fontSize: 11, color: "#1a1a1a" },
      );
      y += 20;

      // Row 3: Username, Password
      await createLabel("Username *", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      await createLabel("Password *", pageIndex, {
        left: rightCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      y += labelOffset;
      await createTextField("username", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: fieldH,
      });
      await createTextField("password", pageIndex, {
        left: rightCol,
        top: y,
        width: fieldW,
        height: fieldH,
      });
      y += fieldH + 12;

      // Row 4: Confirm Password, Account Type (radio)
      await createLabel("Confirm Password *", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      await createLabel("Account Type *", pageIndex, {
        left: rightCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      y += labelOffset;
      await createTextField("confirm_password", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: fieldH,
      });
      // Radio buttons with inline labels
      const radioOptions = ["Personal", "Business", "Enterprise"];
      const radioSpacing = 80;
      await createRadioGroup(
        "account_type",
        radioOptions,
        pageIndex,
        rightCol,
        y + 3,
        radioSpacing,
      );
      // Add labels next to each radio button
      for (let i = 0; i < radioOptions.length; i++) {
        await createLabel(radioOptions[i], pageIndex, {
          left: rightCol + 18 + i * radioSpacing,
          top: y + 2,
          width: 58,
          height: labelH,
        });
      }
      y += fieldH + 20;

      // ---------------------------------------------------------------
      // Section 3: Business & Preferences
      // ---------------------------------------------------------------
      await createLabel(
        "Business & Preferences",
        pageIndex,
        { left: leftCol, top: y, width: 250, height: 14 },
        { fontSize: 11, color: "#1a1a1a" },
      );
      y += 20;

      // Row 5: Company Name, Country (combo)
      await createLabel("Company Name (required if Business/Enterprise)", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      await createLabel("Country *", pageIndex, {
        left: rightCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      y += labelOffset;
      await createTextField("company_name", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: fieldH,
      });
      await createComboBox(
        "country",
        [
          "United States",
          "Canada",
          "United Kingdom",
          "Germany",
          "France",
          "Australia",
          "Japan",
          "Brazil",
          "India",
          "Other",
        ],
        pageIndex,
        { left: rightCol, top: y, width: fieldW, height: fieldH },
      );
      y += fieldH + 12;

      // Row 6: Interests (listbox, taller) + Checkboxes on right
      await createLabel("Interests (select one or more)", pageIndex, {
        left: leftCol,
        top: y,
        width: fieldW,
        height: labelH,
      });
      y += labelOffset;
      const listboxTop = y;
      await createListBox(
        "interests",
        [
          "Technology",
          "Science",
          "Finance",
          "Healthcare",
          "Education",
          "Entertainment",
          "Sports",
          "Travel",
          "Food",
          "Art",
        ],
        pageIndex,
        { left: leftCol, top: y, width: fieldW, height: 80 },
      );

      // Checkboxes on right side, aligned with listbox
      await createLabel("Agreements", pageIndex, {
        left: rightCol,
        top: listboxTop - labelOffset,
        width: fieldW,
        height: labelH,
      });
      await createCheckbox("terms_agree", pageIndex, {
        left: rightCol,
        top: listboxTop + 4,
        width: 15,
        height: 15,
      });
      await createLabel("I agree to the Terms and Conditions *", pageIndex, {
        left: rightCol + 22,
        top: listboxTop + 4,
        width: 200,
        height: labelH,
      });

      await createCheckbox("newsletter", pageIndex, {
        left: rightCol,
        top: listboxTop + 30,
        width: 15,
        height: 15,
      });
      await createLabel("Subscribe to newsletter", pageIndex, {
        left: rightCol + 22,
        top: listboxTop + 30,
        width: 200,
        height: labelH,
      });

      y = listboxTop + 80 + 20; // below the listbox

      // ---------------------------------------------------------------
      // Section 4: Signature & Submit
      // ---------------------------------------------------------------
      await createLabel(
        "Finalize",
        pageIndex,
        { left: leftCol, top: y, width: 200, height: 14 },
        { fontSize: 11, color: "#1a1a1a" },
      );
      y += 20;

      await createLabel("Signature *", pageIndex, {
        left: leftCol,
        top: y,
        width: 200,
        height: labelH,
      });
      y += labelOffset;
      await createSignature("signature", pageIndex, {
        left: leftCol,
        top: y,
        width: 200,
        height: 60,
      });

      // Submit button on right side, vertically centered with signature
      await createButton("submit", "Validate & Submit", pageIndex, {
        left: rightCol,
        top: y + 15,
        width: 150,
        height: 35,
      });

      setStatus(
        "All 15 form fields created! Exporting PDF...",
      );

      // Export the PDF
      const pdfBytes = await instance.exportPDF();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus(
        "PDF ready! Click the download link below, then save it to public/documents/account-registration-form.pdf",
      );
    }).catch((error: Error) => {
      console.error("Error:", error);
      setStatus(`Error: ${error.message}`);
    });

    return () => {
      try {
        if (containerRef.current) {
          window.NutrientViewer?.unload(containerRef.current);
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Account Registration PDF Creator</h1>
      <p style={{ marginBottom: 16, color: "#555" }}>
        This temporary page creates the account-registration-form.pdf with all
        15 form fields. It will auto-export when done.
      </p>
      <p
        style={{
          padding: "8px 12px",
          background: "#f0f0f0",
          borderRadius: 6,
          marginBottom: 16,
        }}
      >
        Status: {status}
      </p>
      {downloadUrl && (
        <a
          href={downloadUrl}
          download="account-registration-form.pdf"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: "#0070f3",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          Download account-registration-form.pdf
        </a>
      )}
      <div
        ref={containerRef}
        style={{
          height: 700,
          border: "1px solid #ddd",
          borderRadius: 8,
          marginTop: 16,
        }}
      />
    </div>
  );
}
