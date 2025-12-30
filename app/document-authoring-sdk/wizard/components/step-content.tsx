"use client";

import { useWizard } from "../context/wizard-context";
import CustomizeStep from "./steps/customize-step";
import DataStep from "./steps/data-step";
import DownloadStep from "./steps/download-step";
import PreviewStep from "./steps/preview-step";
import TemplateStep from "./steps/template-step";

export default function StepContent() {
  const { state } = useWizard();

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return <TemplateStep />;
      case 1:
        return <CustomizeStep />;
      case 2:
        return <DataStep />;
      case 3:
        return <PreviewStep />;
      case 4:
        return <DownloadStep />;
      default:
        return <TemplateStep />;
    }
  };

  // CustomizeStep (step 1) handles its own mobile full-screen layout
  const isCustomizeStep = state.currentStep === 1;

  return (
    <div
      className={`${isCustomizeStep ? "px-0" : "px-4"} md:px-8 py-2 md:py-6 flex-1 flex flex-col`}
    >
      <div className="flex-1 flex flex-col min-h-0">{renderStep()}</div>
    </div>
  );
}
