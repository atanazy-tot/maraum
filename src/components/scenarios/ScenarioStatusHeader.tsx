/**
 * ScenarioStatusHeader
 *
 * Displays weekly completion progress and reset timing.
 * Positioned at the top of the scenario selection page.
 *
 * Visual Hierarchy:
 * - Brand lockup (魔 間) on the left
 * - Completion counter with reset timing on the right
 * - Helper-voice subline when approaching limit
 */

import { useMemo } from "react";
import type { WeeklyUsageDTO } from "@/types";

interface ScenarioStatusHeaderProps {
  usage: WeeklyUsageDTO;
}

/**
 * Get day of week from ISO date string
 */
function getDayOfWeek(isoDate: string): string {
  const date = new Date(isoDate);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

export function ScenarioStatusHeader({ usage }: ScenarioStatusHeaderProps) {
  const { completedCount, limit, resetDateIso } = usage;

  // Determine reset day name
  const resetDay = useMemo(() => getDayOfWeek(resetDateIso), [resetDateIso]);

  // Calculate if user is approaching limit (2/3 completed)
  const isApproachingLimit = completedCount >= limit - 1 && completedCount < limit;

  // Calculate if limit is reached
  const isLimitReached = completedCount >= limit;

  return (
    <header className="border-b bg-white px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          {/* Brand Lockup */}
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              魔 間
            </h1>
          </div>

          {/* Completion Counter */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={`font-semibold ${isLimitReached ? "text-red-600" : "text-gray-900"}`}>
                {completedCount}/{limit} scenarios
              </span>
              <span className="text-gray-400">•</span>
              <span>Resets {resetDay}.</span>
            </div>

            {/* Helper-voice subline when approaching limit */}
            {isApproachingLimit && (
              <p className="mt-1 text-xs italic text-gray-500">
                One more this week, then you'll need to wait.
              </p>
            )}

            {/* Helper-voice subline when limit reached */}
            {isLimitReached && (
              <p className="mt-1 text-xs italic text-red-500">
                Weekly quota exhausted. Patience is a virtue, they say.
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
