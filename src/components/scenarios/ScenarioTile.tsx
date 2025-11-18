/**
 * ScenarioTile
 *
 * Individual scenario card displayed in the carousel.
 * Shows emoji, title, and dynamic state (loading, error).
 *
 * States:
 * - Idle: Ready to be clicked (unless globally disabled)
 * - Starting: Shows loading spinner during POST request
 * - Error: Shows error message from API
 * - Disabled: Grayscale, opacity reduced (when allTilesDisabled = true)
 *
 * Visual Design:
 * - Large emoji (text-6xl)
 * - Scenario title below
 * - Loading/error states at bottom
 * - Hover effects when enabled
 */

import { useMemo } from "react";
import type { ScenarioDisplayModel } from "@/types";

interface ScenarioTileProps {
  scenario: ScenarioDisplayModel;
  isDisabled: boolean;
  status: "idle" | "starting" | "error";
  errorMessage?: string;
  onClick: () => void;
}

export function ScenarioTile({
  scenario,
  isDisabled,
  status,
  errorMessage,
  onClick,
}: ScenarioTileProps) {
  // Determine if tile should be clickable
  const isClickable = useMemo(() => {
    return !isDisabled && status !== "starting";
  }, [isDisabled, status]);

  // Compute CSS classes
  const tileClasses = useMemo(() => {
    const baseClasses = "flex flex-col items-center justify-center rounded-lg border-2 p-8 transition-all min-h-[280px]";

    if (isDisabled) {
      return `${baseClasses} cursor-not-allowed border-gray-200 bg-gray-50 opacity-50 grayscale`;
    }

    if (status === "starting") {
      return `${baseClasses} cursor-wait border-blue-300 bg-blue-50`;
    }

    return `${baseClasses} cursor-pointer border-gray-300 bg-white hover:border-blue-500 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`;
  }, [isDisabled, status]);

  // Handle click
  const handleClick = () => {
    if (isClickable) {
      onClick();
    }
  };

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={tileClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-disabled={!isClickable}
      aria-label={`Start ${scenario.title} scenario`}
    >
      {/* Emoji Icon */}
      <div className="text-6xl" aria-hidden="true">
        {scenario.emoji}
      </div>

      {/* Scenario Title */}
      <h3 className="mt-4 text-xl font-semibold text-gray-900">
        {scenario.title}
      </h3>

      {/* Loading State */}
      {status === "starting" && (
        <div className="mt-4 flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-sm text-blue-600">Starting...</span>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-red-600">
            {errorMessage || "Failed to start scenario"}
          </p>
          <p className="mt-1 text-xs italic text-red-500">
            Try again, maybe?
          </p>
        </div>
      )}
    </div>
  );
}
