import type { CompletionBannerProps } from "@/types/session-view.types";

/**
 * CompletionBanner
 *
 * Minimal notification banner that appears at the top of the interface
 * when a scenario has been completed. Non-dismissible, provides visual
 * confirmation of completion state.
 *
 * Styling: Sticky at top, neutral colors, centered text
 */
export function CompletionBanner({ isVisible }: CompletionBannerProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 px-6 py-3">
      <p className="text-sm text-center text-slate-700">
        Scenario has been concluded.
      </p>
    </div>
  );
}
