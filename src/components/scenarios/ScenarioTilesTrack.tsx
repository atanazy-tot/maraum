/**
 * ScenarioTilesTrack
 *
 * Horizontal container for scenario tiles with CSS transform-based scrolling.
 * Shows exactly 3 tiles at a time (when 3+ scenarios available).
 *
 * Design Notes:
 * - Uses CSS Grid with 3 columns (each 1fr)
 * - Transform: translateX() for smooth scrolling animation
 * - Renders ALL tiles, but only 3 visible at a time
 * - Can be reused for scenario history or other carousel contexts
 */

import { useMemo } from "react";

interface ScenarioTilesTrackProps {
  children: React.ReactNode;
  visibleStartIndex: number;
  visibleCount: number;
}

export function ScenarioTilesTrack({
  children,
  visibleStartIndex,
  visibleCount,
}: ScenarioTilesTrackProps) {
  // Calculate the transform offset
  // Each tile takes up 1/3 of the visible width (33.333%)
  // Move by -100% of tile width for each index
  const translatePercent = useMemo(() => {
    const tileWidthPercent = 100 / visibleCount;
    return -(visibleStartIndex * tileWidthPercent);
  }, [visibleStartIndex, visibleCount]);

  return (
    <div className="overflow-hidden">
      <div
        className="grid transition-transform duration-300 ease-in-out"
        style={{
          gridTemplateColumns: `repeat(${React.Children.count(children)}, 1fr)`,
          transform: `translateX(${translatePercent}%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
