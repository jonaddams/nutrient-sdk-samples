"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Viewer from "../_components/Viewer";

interface PatientData {
  patient: {
    firstName: string;
    lastName: string;
    middleName: string;
    dateOfBirth: string;
    phone: string;
    email: string;
  };
  visitInfo: {
    date: string;
    time: string;
    provider: string;
    reasonForVisit: string;
  };
}

export default function PatientPortal() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<string>("");
  const [appointmentTime, setAppointmentTime] = useState<string>("");
  const viewerInstanceRef = useRef<any>(null);

  const forms = [
    {
      name: "Patient Demographics",
      file: "Patient Demographics Form.pdf",
      duration: "1 min",
    },
    {
      name: "Emergency Contact",
      file: "Emergency Contact Information.pdf",
      duration: "30 sec",
    },
    {
      name: "Insurance Verification",
      file: "Insurance Verification Form.pdf",
      duration: "45 sec",
    },
    {
      name: "Medical History",
      file: "Medical History Questionnaire.pdf",
      duration: "1 min",
    },
    {
      name: "HIPAA Authorization",
      file: "HIPAA Authorization Form.pdf",
      duration: "30 sec",
    },
    {
      name: "Financial Responsibility",
      file: "Financial Responsibility Agreement.pdf",
      duration: "45 sec",
    },
  ];

  useEffect(() => {
    // Simulate loading patient data
    const loadPatientData = async () => {
      setIsLoading(true);
      // In a real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await fetch("/patient-intake/data/patient-data.json");
      const data = await response.json();
      setPatientData(data);
      setIsLoading(false);
    };

    loadPatientData();

    // Set appointment date and time
    const now = new Date();
    const appointmentDateTime = new Date(now.getTime() + 20 * 60 * 1000); // Add 20 minutes

    setAppointmentDate(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );

    setAppointmentTime(
      appointmentDateTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    );
  }, []);

  const checkSignatures = async (): Promise<boolean> => {
    const instance = viewerInstanceRef.current;
    if (!instance) {
      console.error("No viewer instance available");
      return false;
    }

    try {
      // Get NutrientViewer SDK from window
      const NutrientViewer = (window as any).NutrientViewer;
      if (!NutrientViewer) {
        console.error("NutrientViewer SDK not available");
        return false;
      }

      // Get all form fields
      const formFields = await instance.getFormFields();

      // Filter to get only signature fields (excluding staff fields)
      const signatureFields: any[] = [];
      for (const field of formFields) {
        // Use instanceof to check if it's a signature field
        if (field instanceof NutrientViewer.FormFields.SignatureFormField) {
          // Exclude staff signature fields - patients should not sign these
          if (field.name?.toLowerCase().includes("staff")) {
            continue;
          }
          signatureFields.push(field);
        }
      }

      if (signatureFields.length === 0) {
        // No signature fields in this form
        return true;
      }

      // Check each signature field to see if it has been signed
      for (const field of signatureFields) {
        // Use the built-in method to check for overlapping annotations
        const overlapping = await instance.getOverlappingAnnotations(field);

        if (overlapping.size === 0) {
          // Found an unsigned signature field
          alert(
            `Please sign all required signature fields before continuing.\n\nMissing signature for: ${field.name.replace(/_/g, " ")}`,
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error checking signatures:", error);
      return false;
    }
  };

  const handleFormComplete = async () => {
    // Check if all signatures are present
    const allSigned = await checkSignatures();

    if (!allSigned) {
      return; // Don't proceed if signatures are missing
    }

    // Clear the viewer instance ref when moving to next form
    viewerInstanceRef.current = null;

    if (currentStep < forms.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentDocument(null);
    } else {
      // All forms completed - redirect to completion page
      router.push("/web-sdk/patient-intake/patient-portal/completed");
    }
  };

  const openForm = (formIndex: number) => {
    setCurrentDocument(`/patient-intake/documents/${forms[formIndex].file}`);
    setCurrentStep(formIndex);
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "var(--disc-pink)" }}
          ></div>
          <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
            Loading your information...
          </p>
        </div>
      </div>
    );
  }

  if (currentDocument) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        {/* Header */}
        <header
          className="border-b"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--data-green)" }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: "var(--background)" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Patient icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="py-1">
                  <h1
                    className="font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    Patient Check-In
                  </h1>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--foreground)", opacity: 0.7 }}
                  >
                    Springfield Family Medical Center
                  </p>
                </div>
              </div>
              <Link
                href="/web-sdk/patient-intake"
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                style={{
                  background: "var(--neutral)",
                  color: "var(--foreground)",
                }}
              >
                ← Back to Demo
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Form Header Card */}
          <div
            className="rounded-xl border p-6 mb-6"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {forms[currentStep].name}
                </h2>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{
                    background: "var(--disc-pink)",
                    color: "var(--background)",
                  }}
                >
                  Form {currentStep + 1} of {forms.length}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentDocument(null)}
                  className="btn btn-secondary flex-1 whitespace-nowrap"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleFormComplete}
                  className="btn btn-primary flex-1 whitespace-nowrap"
                >
                  Sign & Continue →
                </button>
              </div>
            </div>
          </div>

          {/* Document Viewer Card */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: "var(--background)",
              borderColor: "var(--neutral)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              height: "calc(100vh - 280px)",
            }}
          >
            <Viewer
              document={currentDocument}
              onInstanceReady={(instance) => {
                viewerInstanceRef.current = instance;
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="border-b"
        style={{
          background: "var(--background)",
          borderColor: "var(--neutral)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--data-green)" }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: "var(--background)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="Patient icon"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="py-1">
                <h1
                  className="font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  Patient Check-In
                </h1>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--foreground)", opacity: 0.7 }}
                >
                  Springfield Family Medical Center
                </p>
              </div>
            </div>
            <Link
              href="/web-sdk/patient-intake"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
              style={{
                background: "var(--neutral)",
                color: "var(--foreground)",
              }}
            >
              ← Back to Demo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div
          className="rounded-xl border p-6 mb-8"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex items-center mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
              style={{ background: "var(--data-green)", opacity: 0.2 }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: "var(--data-green)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Checkmark icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-bold" style={{ color: "var(--foreground)" }}>
                Welcome, {patientData?.patient.firstName}{" "}
                {patientData?.patient.lastName}!
              </h2>
              <p style={{ color: "var(--foreground)", opacity: 0.85 }}>
                We&apos;re ready for your appointment today
              </p>
            </div>
          </div>

          <div
            className="border rounded-lg p-4"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--disc-pink) 10%, var(--background))",
              borderColor:
                "color-mix(in srgb, var(--disc-pink) 30%, var(--neutral))",
            }}
          >
            <div className="flex items-center mb-2">
              <svg
                className="w-5 h-5 mr-2"
                style={{ color: "var(--foreground)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Calendar icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3a4 4 0 118 0v4m-4 5v6M3 10h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <strong style={{ color: "var(--foreground)" }}>
                Today&apos;s Appointment
              </strong>
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.9 }}
            >
              <p>
                <strong>Date:</strong> {appointmentDate} at {appointmentTime}
              </p>
              <p>
                <strong>Provider:</strong> {patientData?.visitInfo.provider}
              </p>
              <p>
                <strong>Reason:</strong> {patientData?.visitInfo.reasonForVisit}
              </p>
            </div>
          </div>
        </div>

        {/* Pre-population Notice */}
        <div
          className="border rounded-xl p-6 mb-8"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--data-green) 10%, var(--background))",
            borderColor:
              "color-mix(in srgb, var(--data-green) 30%, var(--neutral))",
          }}
        >
          <div className="flex items-start">
            <div
              className="w-6 h-6 mr-3 mt-0.5"
              style={{ color: "var(--data-green)" }}
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Lightning icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h3
                className="font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Smart Form Pre-Population
              </h3>
              <p
                className="text-sm"
                style={{ color: "var(--foreground)", opacity: 0.9 }}
              >
                Great news! We&apos;ve pre-filled your forms using information
                from your previous visits. Please review each form to ensure
                accuracy and make any necessary updates.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div
          className="rounded-xl border p-6 mb-8"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Your Progress
            </h3>
            <span
              className="text-sm"
              style={{ color: "var(--foreground)", opacity: 0.85 }}
            >
              {currentStep} of {forms.length} completed
            </span>
          </div>

          <div
            className="w-full rounded-full h-2"
            style={{ background: "var(--neutral)" }}
          >
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(currentStep / forms.length) * 100}%`,
                background: "var(--data-green)",
              }}
            ></div>
          </div>

          <p
            className="text-sm mt-2"
            style={{ color: "var(--foreground)", opacity: 0.85 }}
          >
            Estimated time remaining:{" "}
            {Math.max(0, forms.length - currentStep) * 45} seconds
          </p>
        </div>

        {/* Forms List */}
        <div
          className="rounded-xl border p-6"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3
            className="font-semibold mb-6"
            style={{ color: "var(--foreground)" }}
          >
            Intake Forms
          </h3>

          <div className="space-y-4">
            {forms.map((form, index) => (
              <div
                key={form.name}
                className="flex items-center justify-between p-4 rounded-lg border transition-all"
                style={{
                  backgroundColor:
                    index < currentStep
                      ? "color-mix(in srgb, var(--data-green) 10%, var(--background))"
                      : index === currentStep
                        ? "color-mix(in srgb, var(--disc-pink) 10%, var(--background))"
                        : "color-mix(in srgb, var(--neutral) 20%, var(--background))",
                  borderColor:
                    index < currentStep
                      ? "color-mix(in srgb, var(--data-green) 30%, var(--neutral))"
                      : index === currentStep
                        ? "color-mix(in srgb, var(--disc-pink) 30%, var(--neutral))"
                        : "var(--neutral)",
                }}
              >
                <div className="flex items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-4"
                    style={{
                      background:
                        index < currentStep
                          ? "var(--data-green)"
                          : index === currentStep
                            ? "var(--disc-pink)"
                            : "var(--neutral)",
                      color: "var(--background)",
                    }}
                  >
                    {index < currentStep ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        role="img"
                        aria-label="Completed checkmark"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <h4
                      className="font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {form.name}
                    </h4>
                    <p
                      className="text-sm"
                      style={{ color: "var(--foreground)", opacity: 0.85 }}
                    >
                      {index < currentStep
                        ? "Completed"
                        : `Est. ${form.duration}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {index < currentStep && (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: "var(--data-green)",
                        color: "var(--background)",
                      }}
                    >
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        role="img"
                        aria-label="Complete checkmark"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Complete
                    </span>
                  )}

                  {index === currentStep && (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: "var(--disc-pink)",
                        color: "var(--background)",
                      }}
                    >
                      Current
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => openForm(index)}
                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      index > currentStep
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    style={{
                      background:
                        index === currentStep
                          ? "var(--disc-pink)"
                          : index < currentStep
                            ? "var(--data-green)"
                            : "color-mix(in srgb, var(--neutral) 50%, var(--background))",
                      color:
                        index > currentStep
                          ? "color-mix(in srgb, var(--foreground) 50%, var(--background))"
                          : "var(--background)",
                    }}
                    disabled={index > currentStep}
                  >
                    {index < currentStep
                      ? "Review"
                      : index === currentStep
                        ? "Sign & Continue"
                        : "Locked"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div
          className="rounded-xl border p-6 mt-8"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3
            className="font-semibold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            Need Help?
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5"
                style={{ color: "var(--disc-pink)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Technical help icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <strong style={{ color: "var(--foreground)" }}>
                  Technical Issues
                </strong>
                <p style={{ color: "var(--foreground)", opacity: 0.85 }}>
                  Contact IT support at (555) 123-TECH
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5"
                style={{ color: "var(--data-green)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Medical questions icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <div>
                <strong style={{ color: "var(--foreground)" }}>
                  Medical Questions
                </strong>
                <p style={{ color: "var(--foreground)", opacity: 0.85 }}>
                  Ask our front desk staff for assistance
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
