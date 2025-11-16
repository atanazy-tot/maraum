/**
 * ScenarioGridSkeleton
 *
 * Loading skeleton displayed during data refetch.
 * Mimics the carousel layout with shimmer animation.
 *
 * Design:
 * - Matches ScenarioCarousel structure
 * - Shows 3 tile skeletons
 * - Shimmer animation for visual feedback
 * - Accessible loading announcement
 */

export function ScenarioGridSkeleton() {
  return (
    <div className="flex min-h-screen flex-col" role="status" aria-live="polite">
      {/* Accessible loading announcement */}
      <span className="sr-only">Loading scenarios...</span>

      {/* Header Skeleton */}
      <div className="border-b bg-white px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            {/* Brand lockup skeleton */}
            <div className="h-8 w-24 animate-pulse rounded bg-gray-200"></div>

            {/* Stats skeleton */}
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          {/* Title Skeleton */}
          <div className="mb-8 flex flex-col items-center gap-2">
            <div className="h-9 w-64 animate-pulse rounded bg-gray-200"></div>
            <div className="h-5 w-96 animate-pulse rounded bg-gray-200"></div>
          </div>

          {/* Carousel Skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-4">
              {/* Left button skeleton */}
              <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-full bg-gray-200"></div>

              {/* Tiles track skeleton */}
              <div className="flex flex-1 gap-4">
                {/* Render 3 tile skeletons */}
                {[1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-8"
                  >
                    {/* Emoji skeleton */}
                    <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200"></div>

                    {/* Title skeleton */}
                    <div className="mt-4 h-7 w-32 animate-pulse rounded bg-gray-200"></div>
                  </div>
                ))}
              </div>

              {/* Right button skeleton */}
              <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-full bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
