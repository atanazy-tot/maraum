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

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return the scenario details
    const response: ScenarioDetailDTO = scenario;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error (in production, this should use a structured logging service)
    console.error("Error fetching scenario by ID:", error);

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
