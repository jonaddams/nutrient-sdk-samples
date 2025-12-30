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
      className="flex items-center justify-between pt-4 border-t mt-4 bg-white dark:bg-[#2a2020]"
      style={{
        borderColor: "var(--warm-gray-400)",
      }}
    >
      <div>
        {!isFirstStep && (
          <button
            type="button"
            onClick={handlePrevious}
            className="inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors cursor-pointer btn btn-secondary"
            style={{
              borderColor: "var(--warm-gray-400)",
              boxShadow: "var(--shadow-sm)",
            }}
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Step {state.currentStep + 1} of {state.steps.length}
        </span>

        {/* Next/Finish Button */}
        {!isAtLastStep && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className={`inline-flex items-center px-6 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              canProceed
                ? "cursor-pointer btn btn-primary"
                : "cursor-not-allowed"
            }`}
            style={{
              background: canProceed
                ? "var(--digital-pollen)"
                : "var(--warm-gray-400)",
              color: canProceed ? "var(--black)" : "var(--foreground)",
              opacity: canProceed ? 1 : 0.5,
              boxShadow: "var(--shadow-sm)",
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
