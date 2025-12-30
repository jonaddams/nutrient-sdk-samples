"use client";

import type { ReactNode } from "react";
import { useWizard } from "../context/wizard-context";

interface WizardLayoutProps {
  children: ReactNode;
}

export default function WizardLayout({ children }: WizardLayoutProps) {
  const { state } = useWizard();
  const isCustomizeStep = state.currentStep === 1;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      className={`md:rounded-2xl overflow-hidden flex flex-col min-h-[700px] bg-white dark:bg-[#2a2020] ${isCustomizeStep && isMobile ? "w-screen max-w-none" : ""}`}
      style={{
        boxShadow: "var(--shadow-xl)",
      }}
    >
      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-50 rounded-2xl bg-white/75 dark:bg-black/75">
          <div className="flex flex-col items-center space-y-4">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: "var(--digital-pollen)" }}
            />
            <p
              className="font-medium"
              style={{ color: "var(--foreground)", opacity: 0.85 }}
            >
              Processing...
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {state.error && (
        <div
          className="border-l-4 p-4 mb-6"
          style={{
            backgroundColor: "var(--color-error-bg)",
            borderColor: "var(--code-coral)",
          }}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ color: "var(--code-coral)" }}
              >
                <title>Error</title>
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p
                className="text-sm"
                style={{ color: "var(--color-error-text)" }}
              >
                {state.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col">{children}</div>
    </div>
  );
}
