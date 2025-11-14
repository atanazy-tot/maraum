/**
 * GET /api/sessions/:sessionId
 *
 * Retrieve details for a specific session by its ID with optional message history.
 * This endpoint is used for session restoration, viewing session details, and
 * reviewing past conversations.
 *
 * Path Parameters:
 *   - sessionId: UUID v4 format identifying the session
 *
 * Query Parameters:
 *   - include_messages: Boolean (default: true) - whether to include message history
 *
 * Authentication: None required (public endpoint for MVP)
 *
 * Response: SessionDTO
 * Status Codes:
 *   - 200 OK: Session retrieved successfully
 *   - 400 Bad Request: Invalid session ID or query parameter format
 *   - 404 Not Found: Session doesn't exist
 *   - 500 Internal Server Error: Database error
 */

import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { getSessionById } from "@/lib/services/session.service";
import { sessionIdSchema, getSessionQuerySchema } from "@/lib/validation/session.validation";
import { logError, logInfo } from "@/lib/services/logging.service";
import { DatabaseError } from "@/lib/errors";
import { getStandardHeaders } from "@/lib/utils/response-headers";
import type { SessionDTO, ApiErrorDTO } from "@/types";

// Disable prerendering for API routes (required for SSR)
export const prerender = false;

/**
 * GET handler for retrieving a session by ID
 *
 * This handler:
 * 1. Validates sessionId path parameter (UUID format)
 * 2. Validates include_messages query parameter (boolean)
 * 3. Calls session service to fetch data
 * 4. Returns SessionDTO or appropriate error response
 * 5. Logs events for monitoring and debugging
 *
 * @param context - Astro API context containing request, params, locals
 * @returns Response with SessionDTO or ApiErrorDTO
 */
export const GET: APIRoute = async (context) => {
  // Track request duration for performance monitoring
  const startTime = Date.now();

  // Extract sessionId from path parameters
  const sessionIdRaw = context.params.sessionId;

  try {
    // =========================================================================
    // Step 1: Validate session ID path parameter
    // =========================================================================
    let sessionId: string;
    try {
      sessionId = sessionIdSchema.parse(sessionIdRaw);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        const errorResponse: ApiErrorDTO = {
          error: "validation_error",
          message: "That's not even a valid session ID. Did you just make that up?",
          details: {
            field: "sessionId",
            value: sessionIdRaw,
            issue: "Invalid UUID format",
          },
        };

        // Log validation error for monitoring
        await logInfo(
          context.locals.supabase,
          "api_call_failed",
          {
            endpoint: "GET /api/sessions/:sessionId",
            reason: "invalid_session_id",
            provided_value: sessionIdRaw,
          },
          null,
          null
        );

        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: getStandardHeaders(),
        });
      }
      throw validationError;
    }

    // =========================================================================
    // Step 2: Validate query parameters
    // =========================================================================
    const url = new URL(context.request.url);
    const rawQuery = Object.fromEntries(url.searchParams.entries());

    let includeMessages: boolean;
    try {
      // Parse query parameters with defaults
      // Using Object.fromEntries ensures missing params are undefined, not null
      const queryParams = getSessionQuerySchema.parse(rawQuery);
      includeMessages = queryParams.include_messages;
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        const errorResponse: ApiErrorDTO = {
          error: "validation_error",
          message: "I need a simple yes or no. This boolean ambiguity is exhausting.",
          details: {
            field: "include_messages",
            value: rawQuery.include_messages,
            issue: "Must be boolean value (true, false, 1, 0)",
          },
        };

        // Log validation error
        await logInfo(
          context.locals.supabase,
          "api_call_failed",
          {
            endpoint: "GET /api/sessions/:sessionId",
            session_id: sessionId,
            reason: "invalid_query_parameter",
            field: "include_messages",
            provided_value: rawQuery.include_messages,
          },
          sessionId,
          null
        );

        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: getStandardHeaders(),
        });
      }
      throw validationError;
    }

    // =========================================================================
    // Step 3: Extract Supabase client and fetch session
    // =========================================================================
    const supabase = context.locals.supabase;

    // Call service to get session by ID
    const session = await getSessionById(supabase, sessionId, includeMessages);

    // =========================================================================
    // Step 4: Handle not found case
    // =========================================================================
    if (!session) {
      const errorResponse: ApiErrorDTO = {
        error: "not_found",
        message: "I've looked everywhere, and this session simply doesn't exist. Perhaps it never did.",
        details: {
          sessionId: sessionId,
        },
      };

      // Log not found event
      await logInfo(
        supabase,
        "api_call_failed",
        {
          endpoint: "GET /api/sessions/:sessionId",
          session_id: sessionId,
          reason: "session_not_found",
        },
        sessionId,
        null
      );

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: getStandardHeaders(),
      });
    }

    // =========================================================================
    // Step 5: Return successful response
    // =========================================================================
    const response: SessionDTO = session;

    // Calculate request duration for performance monitoring
    const duration = Date.now() - startTime;

    // Log successful retrieval
    await logInfo(
      supabase,
      "api_call_completed",
      {
        endpoint: "GET /api/sessions/:sessionId",
        session_id: sessionId,
        include_messages: includeMessages,
        message_count: includeMessages && session.messages ? session.messages.length : 0,
        is_completed: session.is_completed,
        duration_ms: duration,
      },
      sessionId,
      session.user_id
    );

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: getStandardHeaders(),
    });
  } catch (error) {
    // =========================================================================
    // Step 6: Handle unexpected errors
    // =========================================================================

    // Log error to console for debugging
    console.error("Error fetching session by ID:", error);

    // Determine error type and response
    if (error instanceof DatabaseError) {
      // Database-specific error
      const errorResponse: ApiErrorDTO = {
        error: "database_error",
        message: "The database is having an existential crisis. Try again in a moment.",
        details: {
          operation: "fetch_session",
        },
      };

      // Log database error
      await logError(
        context.locals.supabase,
        "database_error",
        {
          endpoint: "GET /api/sessions/:sessionId",
          session_id: sessionIdRaw,
          error_details: error.details,
          error_message: error.message,
        },
        typeof sessionIdRaw === "string" ? sessionIdRaw : null,
        null
      );

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: getStandardHeaders(),
      });
    }

    // Generic error handler
    const errorResponse: ApiErrorDTO = {
      error: "unknown_error",
      message: "Something went wrong while fetching your session. How unlike a computer.",
      details: {
        operation: "fetch_session",
      },
    };

    // Log unknown error
    await logError(
      context.locals.supabase,
      "unknown_error",
      {
        endpoint: "GET /api/sessions/:sessionId",
        session_id: sessionIdRaw,
        error: error instanceof Error ? error.message : String(error),
      },
      typeof sessionIdRaw === "string" ? sessionIdRaw : null,
      null
    );

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
