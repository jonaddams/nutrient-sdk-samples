"use client";

import { useWizard } from "../context/wizard-context";

export default function StepIndicator() {
  const { state, goToStep } = useWizard();

  return (
    <div
      className="px-2 md:px-8 py-3 md:py-6"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <nav aria-label="Progress">
        {/* Steps with circles and labels */}
        <div className="grid grid-cols-5 gap-4">
          {state.steps.map((step, stepIdx) => (
            <div key={step.id} className="text-center">
              {/* Step Circle */}
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={() => goToStep(stepIdx)}
                  className={`group relative w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer ${
                    !step.isComplete && !step.isActive
                      ? "cursor-not-allowed opacity-50"
                      : ""
                  }`}
                  style={{
                    background: step.isComplete
                      ? "var(--accent)"
                      : "var(--bg-elev)",
                    borderWidth:
                      step.isActive || !step.isComplete ? "2px" : "0",
                    borderStyle: "solid",
                    borderColor: step.isActive
                      ? "var(--accent)"
                      : "var(--line-strong)",
                  }}
                  disabled={!step.isComplete && !step.isActive}
                >
                  <span className="sr-only">{step.title}</span>
                  {step.isComplete ? (
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      style={{ color: "var(--bg-elev)" }}
                    >
                      <title>Step completed</title>
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : step.isActive ? (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                  ) : (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: "var(--ink-4)" }}
                    />
                  )}
                </button>
              </div>

              {/* Step Labels */}
              <div
                className="text-sm font-semibold mb-1"
                style={{
                  color:
                    step.isActive || step.isComplete
                      ? "var(--accent)"
                      : "var(--ink)",
                }}
              >
                {/* Desktop: Full title, Mobile: Short title */}
                <span className="hidden md:inline">{step.title}</span>
                <span className="md:hidden">{step.mobileTitle}</span>
              </div>
              {/* Description - Hidden on mobile */}
              <div
                className="hidden md:block text-xs leading-tight"
                style={{ color: "var(--ink-3)" }}
              >
                {step.description}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
