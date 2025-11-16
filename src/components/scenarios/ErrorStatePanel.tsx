/**
 * ErrorStatePanel
 *
 * Displays error UI when initial data fetch fails.
 * Shows when the scenarios page cannot load scenario data from the API.
 *
 * Design:
 * - Centered layout
 * - Helper-voice error messaging
 * - Retry button with loading state
 * - Error details (optional, for debugging)
 */

import { useState } from "react";
import type { ApiErrorDTO } from "@/types";

interface ErrorStatePanelProps {
  error: ApiErrorDTO;
  onRetry: () => void;
}

export function ErrorStatePanel({ error, onRetry }: ErrorStatePanelProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    onRetry();
    // Note: onRetry typically triggers a page reload, so isRetrying
    // won't reset unless the retry fails to trigger reload
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Error Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-red-600"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Well, this is awkward.
        </h2>
        <p className="mb-6 text-gray-600">
          {error.message || "Failed to load scenarios. The database is being... difficult."}
        </p>

        {/* Helper-voice subline */}
        <p className="mb-6 text-sm italic text-gray-500">
          Technical difficulties happen. Or maybe it's just the void staring back.
        </p>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className={`
            inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-colors
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
            ${
              isRetrying
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600"
            }
          `}
        >
          {isRetrying && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          )}
          <span>{isRetrying ? "Retrying..." : "Try Again"}</span>
        </button>

        {/* Error Details (for debugging) */}
        {error.details && process.env.NODE_ENV === "development" && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error Details (dev only)
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs text-gray-700">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
