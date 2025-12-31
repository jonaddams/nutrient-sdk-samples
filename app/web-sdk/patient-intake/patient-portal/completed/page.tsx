"use client";

import Link from "next/link";

export default function CompletedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-md w-full mx-auto">
        <div
          className="rounded-xl border p-8 text-center"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {/* Success Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "var(--data-green)", opacity: 0.2 }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: "var(--data-green)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Success icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="font-bold mb-4" style={{ color: "var(--foreground)" }}>
            Forms Complete!
          </h1>

          {/* Message */}
          <p
            className="mb-8 leading-relaxed"
            style={{ color: "var(--foreground)", opacity: 0.85 }}
          >
            Thank you for completing the patient intake forms. Please take this
            device to the receptionist to complete your check-in process.
          </p>

          {/* Instructions */}
          <div
            className="border rounded-lg p-4 mb-6"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--disc-pink) 10%, var(--background))",
              borderColor:
                "color-mix(in srgb, var(--disc-pink) 30%, var(--neutral))",
            }}
          >
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5"
                style={{ color: "var(--disc-pink)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Information icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-left">
                <p
                  className="font-medium text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  Next Steps:
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--foreground)", opacity: 0.9 }}
                >
                  Please return this tablet to the front desk. Our staff will
                  review your information and prepare for your appointment.
                </p>
              </div>
            </div>
          </div>

          {/* Back to Demo Link */}
          <div
            className="border-t pt-6"
            style={{ borderColor: "var(--neutral)" }}
          >
            <Link
              href="/web-sdk/patient-intake"
              className="inline-flex items-center px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--foreground)", opacity: 0.85 }}
            >
              ← Back to Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
