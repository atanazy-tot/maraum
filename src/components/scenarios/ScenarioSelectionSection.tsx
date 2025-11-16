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

// Child components
import { ScenarioStatusHeader } from "./ScenarioStatusHeader";
import { StatusBanner } from "./StatusBanner";
import { ScenarioCarousel } from "./ScenarioCarousel";
import { ScenarioTile } from "./ScenarioTile";
import { ErrorStatePanel } from "./ErrorStatePanel";
import { ScenarioGridSkeleton } from "./ScenarioGridSkeleton";

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
    return <ErrorStatePanel error={apiError} onRetry={handleRefresh} />;
  }

  // Show loading skeleton while refetching
  if (isRefetching) {
    return <ScenarioGridSkeleton />;
  }

  // Main render
  return (
    <div className="flex min-h-screen flex-col">
      {/* Status Header - Always visible */}
      <ScenarioStatusHeader usage={weeklyUsage} />

      {/* Main Content Area */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          {/* Section Title */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Choose Your Scenario</h2>
            <p className="mt-2 text-sm italic text-gray-500">
              Pick one. Commit to it. No wandering mid-conversation.
            </p>
          </div>

          {/* Carousel - Always visible */}
          <div className="mb-8">
            <ScenarioCarousel visibleState={carouselState} onScroll={handleScroll}>
              {displayScenarios.map((scenario) => (
                <ScenarioTile
                  key={scenario.id}
                  scenario={scenario}
                  isDisabled={allTilesDisabled}
                  status={actionState[scenario.id]?.status || "idle"}
                  errorMessage={actionState[scenario.id]?.error?.message}
                  onClick={() => handleStartScenario(scenario.id)}
                />
              ))}
            </ScenarioCarousel>
          </div>

          {/* Status Banner - Only shown when tiles are disabled */}
          {statusBannerVariant && (
            <StatusBanner
              variant={statusBannerVariant}
              activeSession={activeSession}
              usage={weeklyUsage}
              onResume={handleResume}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}
