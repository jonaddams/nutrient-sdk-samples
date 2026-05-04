"use client";

import { useWizard } from "../context/wizard-context";

interface StepNavigationProps {
  canProceed?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  isLastStep?: boolean;
}

export default function StepNavigation({
  canProceed = true,
  onNext,
  onPrevious,
  nextLabel = "Next",
  previousLabel = "Previous",
  isLastStep = false,
}: StepNavigationProps) {
  const { state, nextStep, prevStep } = useWizard();

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      nextStep();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else {
      prevStep();
    }
  };

  const isFirstStep = state.currentStep === 0;
  const isAtLastStep = state.currentStep === state.steps.length - 1;

  return (
    <div
      className="flex items-center justify-between pt-4 mt-4"
      style={{
        background: "var(--bg-elev)",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div>
        {!isFirstStep && (
          <button
            type="button"
            onClick={handlePrevious}
            className="btn ghost btn-sm inline-flex items-center"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Previous step</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {previousLabel}
          </button>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Progress Info */}
        <span className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>
          Step {state.currentStep + 1} of {state.steps.length}
        </span>

        {/* Next/Finish Button */}
        {!isAtLastStep && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="btn btn-sm inline-flex items-center"
            style={{
              background: canProceed ? "var(--accent)" : "var(--ink-5)",
              borderColor: canProceed ? "var(--accent)" : "var(--ink-5)",
              color: canProceed ? "#fff" : "var(--ink-3)",
              opacity: canProceed ? 1 : 0.6,
              cursor: canProceed ? "pointer" : "not-allowed",
            }}
          >
            {isLastStep ? "Finish" : nextLabel}
            {!isLastStep && (
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Next step</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
