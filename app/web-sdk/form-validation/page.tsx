"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";
import { TOTAL_RULE_FIELDS, type ValidationState } from "./viewer";
import "./styles.css";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

// Human-friendly labels for field names
const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name",
  email: "Email Address",
  phone: "Phone Number",
  date_of_birth: "Date of Birth",
  username: "Username",
  password: "Password",
  confirm_password: "Confirm Password",
  account_type: "Account Type",
  company_name: "Company Name",
  country: "Country",
  interests: "Interests",
  terms_agree: "Terms & Conditions",
  newsletter: "Newsletter",
  signature: "Signature",
};

// TOTAL_RULE_FIELDS is imported from viewer.tsx — derived from the rule map, no magic constant

export default function FormValidationPage() {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    validatedFields: new Set(),
  });

  const validateAllRef = useRef<(() => Promise<void>) | null>(null);
  const resetRef = useRef<(() => Promise<void>) | null>(null);
  const resetFormRef = useRef<(() => Promise<void>) | null>(null);
  const navigateToFieldRef = useRef<
    ((fieldName: string) => Promise<void>) | null
  >(null);

  const handleValidationChange = useCallback((state: ValidationState) => {
    setValidationState(state);
  }, []);

  const errorCount = Object.keys(validationState.errors).length;
  const validatedCount = validationState.validatedFields.size;
  const validCount = validatedCount - errorCount;
  const pendingCount = TOTAL_RULE_FIELDS - validatedCount;

  const errorEntries = Object.entries(validationState.errors);
  const validFields = Array.from(validationState.validatedFields).filter(
    (f) => !validationState.errors[f],
  );

  return (
    <SampleFrame
      title="Form Validation"
      description="Client-side validation rules with visual feedback on PDF form fields. Edit fields to see real-time validation, or click Validate All for a full check."
    >
      <div className="validation-wrapper">
            {/* Sidebar */}
            <div className="validation-sidebar">
              {/* Header */}
              <div className="validation-header">
                <div className="validation-title">Validation Rules</div>
                <div className="validation-subtitle">
                  {TOTAL_RULE_FIELDS} rules active · {errorCount} error
                  {errorCount !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Status counters */}
              <div className="validation-counters">
                <div className="validation-counter validation-counter--valid">
                  <div className="validation-counter-value">{validCount}</div>
                  <div className="validation-counter-label">Valid</div>
                </div>
                <div className="validation-counter validation-counter--errors">
                  <div className="validation-counter-value">{errorCount}</div>
                  <div className="validation-counter-label">Errors</div>
                </div>
                <div className="validation-counter validation-counter--pending">
                  <div className="validation-counter-value">{pendingCount}</div>
                  <div className="validation-counter-label">Pending</div>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="validation-content">
                {/* Errors section */}
                {errorEntries.length > 0 && (
                  <div>
                    <div className="validation-section-label validation-section-label--errors">
                      ✕ Errors
                    </div>
                    <div className="validation-error-list">
                      {errorEntries.map(([fieldName, message]) => (
                        <button
                          key={fieldName}
                          type="button"
                          className="validation-error-card"
                          onClick={() =>
                            navigateToFieldRef.current?.(fieldName)
                          }
                        >
                          <div className="validation-error-field">
                            {FIELD_LABELS[fieldName] ?? fieldName}
                          </div>
                          <div className="validation-error-message">
                            {message}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid section */}
                {validFields.length > 0 && (
                  <div>
                    <div className="validation-section-label validation-section-label--valid">
                      ✓ Valid
                    </div>
                    <div className="validation-valid-list">
                      {validFields.map((fieldName) => (
                        <div key={fieldName} className="validation-valid-row">
                          <span className="validation-valid-check">✓</span>
                          <span className="validation-valid-name">
                            {FIELD_LABELS[fieldName] ?? fieldName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {validatedCount === 0 && (
                  <div className="validation-empty">
                    Fill in form fields to see real-time validation, or click
                    &ldquo;Validate All&rdquo; to check all fields at once.
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="validation-actions">
                <button
                  type="button"
                  className="validation-btn-primary"
                  onClick={() => validateAllRef.current?.()}
                >
                  Validate All
                </button>
                <button
                  type="button"
                  className="validation-btn-secondary"
                  onClick={() => resetRef.current?.()}
                >
                  Reset Validation
                </button>
                <button
                  type="button"
                  className="validation-btn-secondary"
                  onClick={() => resetFormRef.current?.()}
                >
                  Reset Form Fields
                </button>
              </div>
            </div>

            {/* Viewer */}
            <div className="validation-viewer-container">
              <Viewer
                onValidationChange={handleValidationChange}
                validateAllRef={validateAllRef}
                resetRef={resetRef}
                resetFormRef={resetFormRef}
                navigateToFieldRef={navigateToFieldRef}
              />
            </div>
      </div>
    </SampleFrame>
  );
}
