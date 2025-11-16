/**
 * ScenarioSelectionSection
 *
 * React container component that orchestrates the scenario selection experience.
 * Manages state, actions, and conditional rendering for:
 * - Scenario carousel (always visible)
 * - Status header (weekly progress)
 * - Status banner (active session or rate limit messaging)
 * - Error handling and loading states
 *
 * Key Behaviors:
 * - Disables ALL tiles when active session exists OR weekly limit reached
 * - Shows unified status banner below carousel explaining disabled state
 * - Handles scenario selection, session creation, and resume navigation
 */

import { useState, useMemo, useCallback } from "react";
import type {
  ScenarioSelectionPageProps,
  ScenarioDisplayModel,
  ScenarioActionState,
  ScenarioCarouselState,
  ApiErrorDTO,
  StatusBannerVariant,
  ScenarioListItemDTO,
} from "@/types";

// Child components (to be implemented)
// import { ScenarioStatusHeader } from "./ScenarioStatusHeader";
// import { StatusBanner } from "./StatusBanner";
// import { ScenarioCarousel } from "./ScenarioCarousel";
// import { ErrorStatePanel } from "./ErrorStatePanel";
// import { ScenarioGridSkeleton } from "./ScenarioGridSkeleton";

/**
 * Props for ScenarioSelectionSection
 */
interface ScenarioSelectionSectionProps {
  data: ScenarioSelectionPageProps;
}

/**
 * Utility function to map ScenarioListItemDTO to ScenarioDisplayModel
 */
function mapScenarioToDisplayModel(scenario: ScenarioListItemDTO): ScenarioDisplayModel {
  return {
    id: scenario.id,
    title: scenario.title,
    emoji: scenario.emoji,
    initialMessages: {
      main: scenario.initial_message_main,
      helper: scenario.initial_message_helper,
    },
    isActive: scenario.is_active,
  };
}

/**
 * ScenarioSelectionSection Component
 */
export function ScenarioSelectionSection({ data }: ScenarioSelectionSectionProps) {
  const { scenarios: scenariosList, weeklyUsage, activeSession } = data;

  // =============================================================================
  // State Management
  // =============================================================================

  // Transform scenarios to display models
  const [displayScenarios] = useState<ScenarioDisplayModel[]>(() =>
    scenariosList.map(mapScenarioToDisplayModel)
  );

  // Carousel navigation state
  const [carouselState, setCarouselState] = useState<ScenarioCarouselState>(() => {
    const visibleCount = Math.min(3, displayScenarios.length);
    return {
      visibleStartIndex: 0,
      visibleCount,
      hasPrev: false,
      hasNext: displayScenarios.length > visibleCount,
    };
  });

  // Track POST request states per scenario
  const [actionState, setActionState] = useState<ScenarioActionState>(() => {
    const initialState: ScenarioActionState = {};
    displayScenarios.forEach((scenario) => {
      initialState[scenario.id] = { status: "idle" };
    });
    return initialState;
  });

  // API error state (for GET failures)
  const [apiError, setApiError] = useState<ApiErrorDTO | null>(null);

  // Refetching state
  const [isRefetching, setIsRefetching] = useState(false);

  // =============================================================================
  // Computed Values
  // =============================================================================

  // Determine if ALL tiles should be disabled
  const allTilesDisabled = useMemo(() => {
    return activeSession !== null || weeklyUsage.completedCount >= weeklyUsage.limit;
  }, [activeSession, weeklyUsage]);

  // Determine which status banner variant to show (if any)
  const statusBannerVariant = useMemo((): StatusBannerVariant | null => {
    if (activeSession !== null) {
      return "active-session";
    }
    if (weeklyUsage.completedCount >= weeklyUsage.limit) {
      return "rate-limit";
    }
    return null;
  }, [activeSession, weeklyUsage]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  /**
   * Handle carousel scroll in given direction
   */
  const handleScroll = useCallback(
    (direction: "left" | "right") => {
      setCarouselState((prev) => {
        const scrollAmount = 3;
        let newIndex = prev.visibleStartIndex;

        if (direction === "left") {
          newIndex = Math.max(0, prev.visibleStartIndex - scrollAmount);
        } else {
          const maxIndex = Math.max(0, displayScenarios.length - prev.visibleCount);
          newIndex = Math.min(maxIndex, prev.visibleStartIndex + scrollAmount);
        }

        return {
          ...prev,
          visibleStartIndex: newIndex,
          hasPrev: newIndex > 0,
          hasNext: newIndex + prev.visibleCount < displayScenarios.length,
        };
      });
    },
    [displayScenarios.length]
  );

  /**
   * Handle scenario selection (start new session)
   * Blocked when allTilesDisabled is true
   */
  const handleStartScenario = useCallback(
    async (scenarioId: number) => {
      // Guard: Prevent action if tiles are globally disabled
      if (allTilesDisabled) {
        return;
      }

      // Guard: Prevent duplicate requests
      if (actionState[scenarioId]?.status === "starting") {
        return;
      }

      // Set loading state
      setActionState((prev) => ({
        ...prev,
        [scenarioId]: { status: "starting" },
      }));

      try {
        // POST to create new session
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario_id: scenarioId }),
        });

        if (!response.ok) {
          const errorData: ApiErrorDTO = await response.json();
          throw errorData;
        }

        const sessionData = await response.json();

        // Reset action state
        setActionState((prev) => ({
          ...prev,
          [scenarioId]: { status: "idle" },
        }));

        // Redirect to session page
        window.location.href = `/session?id=${sessionData.id}`;
      } catch (error) {
        // Handle error
        const apiError = error as ApiErrorDTO;
        setActionState((prev) => ({
          ...prev,
          [scenarioId]: { status: "error", error: apiError },
        }));

        console.error("Failed to start scenario:", apiError);
      }
    },
    [allTilesDisabled, actionState]
  );

  /**
   * Handle resuming active session
   */
  const handleResume = useCallback(() => {
    if (activeSession) {
      window.location.href = `/session?id=${activeSession.session_id}`;
    }
  }, [activeSession]);

  /**
   * Handle refetching data (retry after error or refresh usage)
   */
  const handleRefresh = useCallback(async () => {
    setIsRefetching(true);

    try {
      // Reload the page to fetch fresh data
      // In a more sophisticated implementation, this would re-fetch data client-side
      window.location.reload();
    } catch (error) {
      console.error("Failed to refresh:", error);
      setIsRefetching(false);
    }
  }, []);

  // =============================================================================
  // Render
  // =============================================================================

  // Show error panel if initial data fetch failed
  if (apiError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* <ErrorStatePanel error={apiError} onRetry={handleRefresh} /> */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">Error Loading Scenarios</h2>
          <p className="mt-2 text-gray-600">{apiError.message}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading skeleton while refetching
  if (isRefetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {/* <ScenarioGridSkeleton /> */}
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="flex min-h-screen flex-col">
      {/* Status Header - Always visible */}
      <div className="border-b bg-white px-4 py-6">
        {/* <ScenarioStatusHeader usage={weeklyUsage} /> */}
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">魔 間</div>
              <div className="text-sm text-gray-600">
                {weeklyUsage.completedCount}/{weeklyUsage.limit} scenarios this week
                {" • "}
                Resets {new Date(weeklyUsage.resetDateIso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          {/* Carousel - Always visible */}
          <div className="mb-8">
            {/* <ScenarioCarousel
              scenarios={displayScenarios}
              visibleState={carouselState}
              allTilesDisabled={allTilesDisabled}
              onScroll={handleScroll}
              onTileClick={handleStartScenario}
            /> */}
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-semibold">Choose Your Scenario</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {displayScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`rounded-lg border p-6 ${
                      allTilesDisabled
                        ? "cursor-not-allowed opacity-50 grayscale"
                        : "cursor-pointer hover:shadow-lg"
                    }`}
                    onClick={() => !allTilesDisabled && handleStartScenario(scenario.id)}
                  >
                    <div className="text-4xl">{scenario.emoji}</div>
                    <h3 className="mt-2 font-semibold">{scenario.title}</h3>
                    {actionState[scenario.id]?.status === "starting" && (
                      <div className="mt-2 text-sm text-gray-500">Starting...</div>
                    )}
                    {actionState[scenario.id]?.status === "error" && (
                      <div className="mt-2 text-sm text-red-500">Error</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status Banner - Conditional */}
          {statusBannerVariant && (
            <div className="mb-8">
              {/* <StatusBanner
                variant={statusBannerVariant}
                activeSession={activeSession}
                usage={weeklyUsage}
                onResume={handleResume}
                onRefresh={handleRefresh}
              /> */}
              <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-4">
                {statusBannerVariant === "active-session" && activeSession && (
                  <div>
                    <p className="font-semibold">You have an active session</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Continue your conversation in "{activeSession.scenario_title}"
                    </p>
                    <button
                      onClick={handleResume}
                      className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      Resume scenario
                    </button>
                  </div>
                )}
                {statusBannerVariant === "rate-limit" && (
                  <div>
                    <p className="font-semibold">Weekly limit reached</p>
                    <p className="mt-1 text-sm text-gray-600">
                      You've completed {weeklyUsage.completedCount}/{weeklyUsage.limit} scenarios this
                      week. Come back after{" "}
                      {new Date(weeklyUsage.resetDateIso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      .
                    </p>
                    <button
                      onClick={handleRefresh}
                      className="mt-2 rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
                    >
                      Refresh status
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
