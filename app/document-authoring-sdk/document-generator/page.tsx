"use client";

import { useEffect } from "react";
import { PageHeader } from "@/app/_components/PageHeader";
import StepContent from "../wizard/components/step-content";
import StepIndicator from "../wizard/components/step-indicator";
import WizardLayout from "../wizard/components/wizard-layout";
import { WizardProvider } from "../wizard/context/wizard-context";

export default function DocumentAuthoringSdkPage() {
  // Simplified global error handler for SDK IntersectionObserver errors
  useEffect(() => {
    const handleSDKError = (event: ErrorEvent): boolean | undefined => {
      const filename = event.filename || "";
      const message = event.message || "";
      const stack = event.error?.stack || "";

      // Handle SDK errors more aggressively
      if (
        filename.includes("docauth-impl") ||
        filename.includes("document-authoring.cdn.nutrient.io") ||
        stack.includes("docauth-impl") ||
        stack.includes("document-authoring.cdn.nutrient.io") ||
        message.includes("IntersectionObserver")
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
      return true;
    };

    // Simplified promise rejection handler
    const handleSDKRejection = (
      event: PromiseRejectionEvent,
    ): boolean | undefined => {
      const stack = event.reason?.stack || "";

      if (
        stack.includes("docauth-impl") ||
        stack.includes("document-authoring.cdn.nutrient.io")
      ) {
        console.warn("🛡️ SDK promise rejection suppressed");
        event.preventDefault();
        return false;
      }
      return true;
    };

    // Override console.error only for SDK errors to completely suppress them
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const message = args.join(" ");
      const errorArg = args.find(
        (arg): arg is Error =>
          arg instanceof Error ||
          (typeof arg === "object" && arg !== null && "stack" in arg),
      );
      const stack = errorArg?.stack || "";

      // Suppress known SDK errors but log them silently for debugging
      if (
        message.includes("docauth-impl") ||
        stack.includes("docauth-impl") ||
        stack.includes("document-authoring.cdn.nutrient.io")
      ) {
        // Log suppressed errors with a prefix for debugging
        console.warn("🛡️ Suppressed SDK error:", message.substring(0, 100));
        return;
      }

      originalConsoleError.apply(console, args);
    };

    // Monkey-patch IntersectionObserver with complete error suppression
    const OriginalIntersectionObserver = window.IntersectionObserver;
    if (OriginalIntersectionObserver) {
      window.IntersectionObserver = class extends OriginalIntersectionObserver {
        constructor(
          callback: IntersectionObserverCallback,
          options?: IntersectionObserverInit,
        ) {
          const safeCallback: IntersectionObserverCallback = (
            entries,
            observer,
          ) => {
            try {
              callback(entries, observer);
            } catch (error) {
              // Log suppressed IntersectionObserver errors for debugging
              console.warn(
                "🛡️ Suppressed IntersectionObserver error:",
                error instanceof Error ? error.message : String(error),
              );
              return;
            }
          };
          super(safeCallback, options);
        }
      };
    }

    // Minimal event handlers only
    window.addEventListener("error", handleSDKError);
    window.addEventListener("unhandledrejection", handleSDKRejection);

    return () => {
      window.removeEventListener("error", handleSDKError);
      window.removeEventListener("unhandledrejection", handleSDKRejection);
      // Restore original IntersectionObserver
      if (OriginalIntersectionObserver) {
        window.IntersectionObserver = OriginalIntersectionObserver;
      }
      // Restore original console.error
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Document Generator"
        description="Create professional documents in just a few steps"
        breadcrumbs={[
          { label: "Home", href: "/" },
          {
            label: "Document Authoring SDK",
            href: "/document-authoring-sdk",
          },
        ]}
        sticky={true}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Document Generator
          </h1>
          <p
            className="text-lg font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Create professional documents in just a few steps
          </p>
        </div>

        {/* Wizard */}
        <WizardProvider>
          <WizardLayout>
            <StepIndicator />
            <StepContent />
          </WizardLayout>
        </WizardProvider>
      </main>
    </div>
  );
}
