/**
 * GET /api/scenarios/:scenarioId
 *
 * Retrieve details for a specific scenario by its ID.
 * Only returns active scenarios (is_active = true).
 *
 * Path Parameters:
 *   - scenarioId: Positive integer identifying the scenario
 *
 * Authentication: None required (public endpoint for MVP)
 *
 * Response: ScenarioDetailDTO
 * Status Codes:
 *   - 200 OK: Scenario retrieved successfully
 *   - 400 Bad Request: Invalid scenario ID format
 *   - 404 Not Found: Scenario doesn't exist or is inactive
 *   - 500 Internal Server Error: Database error
 */

import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { getScenarioById } from "@/lib/services/scenarios.service";
import { scenarioIdSchema } from "@/lib/validation/scenarios.validation";
import { logError, logInfo } from "@/lib/services/logging.service";
import type { ScenarioDetailDTO, ApiErrorDTO } from "@/types";

// Disable prerendering for API routes (required for SSR)
export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // Extract Supabase client from context.locals (injected by middleware)
    const supabase = context.locals.supabase;

    // Extract and validate scenarioId from path parameters
    const scenarioIdRaw = context.params.scenarioId;

    let scenarioId: number;
    try {
      scenarioId = scenarioIdSchema.parse(scenarioIdRaw);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        const firstError = validationError.errors[0];
        const errorResponse: ApiErrorDTO = {
          error: "validation_error",
          message: `Hmm, that scenario ID doesn't look quite right. ${firstError.message}.`,
          details: {
            field: "scenarioId",
            value: scenarioIdRaw,
            issues: validationError.errors,
          },
        };

        // Log validation error
        await logInfo(
          context.locals.supabase,
          "api_call_failed",
          {
            endpoint: "GET /api/scenarios/:scenarioId",
            reason: "invalid_scenario_id",
            provided_value: scenarioIdRaw,
          },
          null,
          null
        );

        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw validationError;
    }

    // Call service to get scenario by ID
    const scenario = await getScenarioById(supabase, scenarioId);

    // Handle not found case
    if (!scenario) {
      const errorResponse: ApiErrorDTO = {
        error: "not_found",
        message: `Scenario ${scenarioId} seems to have wandered off. Perhaps it never existed, or maybe it's just not available right now.`,
      };

      // Log not found event
      await logInfo(
        supabase,
        "api_call_failed",
        {
          endpoint: "GET /api/scenarios/:scenarioId",
          scenario_id: scenarioId,
          reason: "scenario_not_found",
        },
        null,
        null
      );

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return the scenario details
    const response: ScenarioDetailDTO = scenario;

    // Log successful retrieval
    await logInfo(
      supabase,
      "api_call_completed",
      {
        endpoint: "GET /api/scenarios/:scenarioId",
        scenario_id: scenarioId,
        scenario_title: scenario.title,
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
    console.error("Error fetching scenario by ID:", error);

    // Log database error
    await logError(
      context.locals.supabase,
      "database_error",
      {
        endpoint: "GET /api/scenarios/:scenarioId",
        scenario_id: context.params.scenarioId,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      null
    );

    // Return error response following the ApiErrorDTO format
    const errorResponse: ApiErrorDTO = {
      error: "database_error",
      message: "Something went awry while fetching that scenario. The database is being... difficult.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
