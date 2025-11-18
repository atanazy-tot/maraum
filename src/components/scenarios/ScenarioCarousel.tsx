/**
 * ScenarioCarousel
 *
 * Reusable horizontal carousel component for displaying scenarios.
 * Shows exactly 3 tiles at a time with left/right navigation.
 *
 * Key Features:
 * - Scroll buttons function independently of tile disabled state
 * - Right button always rendered (disabled when no more tiles)
 * - Can be reused for scenario selection, history, or other contexts
 * - Accepts generic children (ScenarioTile components)
 *
 * Props:
 * - children: ScenarioTile components to display
 * - visibleState: Current carousel navigation state
 * - onScroll: Callback for scroll button clicks
 */

import { ScrollButton } from "./ScrollButton";
import { ScenarioTilesTrack } from "./ScenarioTilesTrack";
import type { ScenarioCarouselState } from "@/types";

interface ScenarioCarouselProps {
  children: React.ReactNode;
  visibleState: ScenarioCarouselState;
  onScroll: (direction: "left" | "right") => void;
}

export function ScenarioCarousel({ children, visibleState, onScroll }: ScenarioCarouselProps) {
  const { visibleStartIndex, visibleCount, hasPrev, hasNext } = visibleState;

  return (
    <div className="relative" role="region" aria-label="Scenario carousel">
      {/* Carousel Container */}
      <div className="flex items-center gap-4">
        {/* Left Scroll Button */}
        <div className="flex-shrink-0">
          <ScrollButton
            direction="left"
            disabled={!hasPrev}
            onClick={() => onScroll("left")}
            ariaLabel="Scroll to previous scenarios"
          />
        </div>

        {/* Tiles Track */}
        <div className="flex-1">
          <ScenarioTilesTrack visibleStartIndex={visibleStartIndex} visibleCount={visibleCount}>
            {children}
          </ScenarioTilesTrack>
        </div>

        {/* Right Scroll Button */}
        <div className="flex-shrink-0">
          <ScrollButton
            direction="right"
            disabled={!hasNext}
            onClick={() => onScroll("right")}
            ariaLabel="Scroll to next scenarios"
          />
        </div>
      </div>
    </div>
  );
}
