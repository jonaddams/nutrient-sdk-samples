"use client";

import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

/**
 * Loading Spinner Component
 * Shows loading state during async operations
 */
export function LoadingSpinner({
  message = "Loading...",
  size = "md",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const containerClasses = fullScreen
    ? "fixed inset-0 flex items-center justify-center bg-black/50 z-50"
    : "flex items-center justify-center p-8";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-3">
        <Loader2
          className={`${sizeClasses[size]} animate-spin text-[var(--digital-pollen)]`}
        />
        {message && (
          <p className="text-sm text-[var(--warm-gray-600)] !mb-0">{message}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Inline loading indicator for buttons
 */
export function ButtonSpinner() {
  return <Loader2 className="w-4 h-4 animate-spin" />;
}
