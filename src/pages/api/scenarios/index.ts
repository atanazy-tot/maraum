/**
 * GET /api/scenarios
 *
 * List all active scenarios available for language learning.
 * Returns scenarios ordered by sort_order, including initial messages
 * for both chat panels to enable immediate session initialization.
 *
 * Authentication: None required (public endpoint for MVP)
 *
 * Response: ScenariosListResponseDTO
 * Status Codes:
 *   - 200 OK: Scenarios retrieved successfully
 *   - 500 Internal Server Error: Database error
 */

import type { APIRoute } from "astro";

import { getActiveScenarios } from "@/lib/services/scenarios.service";
import { logError, logInfo } from "@/lib/services/logging.service";
import type { ScenariosListResponseDTO, ApiErrorDTO } from "@/types";

// Disable prerendering for API routes (required for SSR)
export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // Extract Supabase client from context.locals (injected by middleware)
    const supabase = context.locals.supabase;

    // Call service to get active scenarios
    const scenarios = await getActiveScenarios(supabase);

    // Prepare response
    const response: ScenariosListResponseDTO = { scenarios };

    // Log successful retrieval
    await logInfo(
      supabase,
      "api_call_completed",
      {
        endpoint: "GET /api/scenarios",
        scenario_count: scenarios.length,
      },
      null,
      null
    );

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error to console for debugging
    console.error("Error fetching scenarios:", error);

    // Log database error
    await logError(
      context.locals.supabase,
      "database_error",
      {
        endpoint: "GET /api/scenarios",
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      null
    );

    // Return error response following the ApiErrorDTO format
    const errorResponse: ApiErrorDTO = {
      error: "database_error",
      message: "Unable to retrieve scenarios. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
