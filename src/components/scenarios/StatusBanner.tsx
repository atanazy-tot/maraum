/**
 * StatusBanner
 *
 * Unified banner component displayed BELOW the carousel to explain
 * why scenario tiles are disabled. Shows context-specific messaging
 * in helper's sarcastic voice.
 *
 * Two Variants:
 * - 'active-session': User has ongoing session, must resume or abandon
 * - 'rate-limit': Weekly completion limit reached, must wait for reset
 *
 * Note: This component should ONLY be rendered when tiles are disabled.
 * The parent component handles conditional rendering.
 */

import type { StatusBannerVariant, ActiveSessionSummary, WeeklyUsageDTO } from "@/types";

interface StatusBannerProps {
  variant: StatusBannerVariant;
  activeSession: ActiveSessionSummary | null;
  usage: WeeklyUsageDTO;
  onResume: () => void;
  onRefresh: () => void;
}

/**
 * Get day of week from ISO date string
 */
function getDayOfWeek(isoDate: string): string {
  const date = new Date(isoDate);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

export function StatusBanner({ variant, activeSession, usage, onResume, onRefresh }: StatusBannerProps) {
  // Active session variant
  if (variant === "active-session" && activeSession) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-amber-400 bg-amber-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">
              You already started something.
            </h3>
            <p className="mt-1 text-sm text-amber-700">
              Still working through <span className="font-medium">"{activeSession.scenario_title}"</span>.
              One scenario at a time—commitment, remember?
            </p>
          </div>
          <button
            onClick={onResume}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            Resume scenario
          </button>
        </div>
      </div>
    );
  }

  // Rate limit variant
  if (variant === "rate-limit") {
    const resetDay = getDayOfWeek(usage.resetDateIso);

    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-gray-300 bg-gray-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              Weekly quota exhausted.
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              You've completed {usage.completedCount}/{usage.limit} scenarios this week.
              Impressive, but also... the limit. Come back {resetDay}.
            </p>
            <p className="mt-2 text-xs italic text-gray-500">
              Patience builds character. Or so I'm told.
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            Refresh status
          </button>
        </div>
      </div>
    );
  }

  // Should not reach here if parent component handles conditional rendering correctly
  return null;
}
