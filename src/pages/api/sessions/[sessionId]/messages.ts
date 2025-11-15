/**
 * Messages API Endpoint
 *
 * GET /api/sessions/:sessionId/messages
 * Retrieves messages for a specific session with support for filtering,
 * pagination, and sorting. This endpoint enables the frontend to load
 * conversation history for session restoration or display purposes.
 *
 * POST /api/sessions/:sessionId/messages
 * Sends a user message and receives a complete AI response from Claude API.
 * Handles idempotency, session completion detection, and message persistence.
 *
 * Authentication: None required (public endpoint for MVP)
 */

import type { APIRoute } from "astro";
import { z } from "zod";

import {
  getSessionMessages,
  checkIdempotency,
  validateSessionActive,
  saveUserMessage,
  saveAssistantMessage,
  completeSession,
  buildMessageResponseDTO,
} from "@/lib/services/messages.service";
import { GetMessagesQuerySchema, SendMessageBodySchema, isValidUUID } from "@/lib/validation/messages.validation";
import { NotFoundError, DatabaseError, ConflictError, ApiError } from "@/lib/errors";
import { logEvent, logError, logApiCall, logInfo } from "@/lib/utils/logger";
import { callClaudeAPI } from "@/lib/services/claude-api.service";
import { getPromptForChatType } from "@/lib/services/prompt.service";
import type { ApiErrorDTO } from "@/types";

// Disable prerendering for API routes (required for SSR)
export const prerender = false;

export const GET: APIRoute = async ({ params, url, locals }) => {
  const sessionId = params.sessionId;
  const supabase = locals.supabase;

  try {
    // Step 1: Validate session ID format
    if (!sessionId || !isValidUUID(sessionId)) {
      const error: ApiErrorDTO = {
        error: "validation_error",
        message: "Invalid session ID format.",
        details: { sessionId: "Must be a valid UUID" },
      };

      await logEvent(supabase, "warn", "validation_error", null, {
        endpoint: "/api/sessions/:sessionId/messages",
        error: "Invalid session ID",
      });

      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Parse and validate query parameters
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let validatedQuery;

    try {
      validatedQuery = GetMessagesQuerySchema.parse(searchParams);
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        const error: ApiErrorDTO = {
          error: "validation_error",
          message: "Invalid query parameters provided.",
          details: zodError.flatten().fieldErrors,
        };

        await logEvent(supabase, "warn", "validation_error", sessionId, {
          endpoint: "/api/sessions/:sessionId/messages",
          errors: error.details,
        });

        return new Response(JSON.stringify(error), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Re-throw unexpected errors
      throw zodError;
    }

    // Step 3: Call service layer
    const response = await getSessionMessages(supabase, sessionId, validatedQuery);

    // Step 4: Log successful request
    await logEvent(supabase, "info", "messages_retrieved", sessionId, {
      endpoint: "/api/sessions/:sessionId/messages",
      message_count: response.messages.length,
      chat_type: validatedQuery.chat_type,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
    });

    // Step 5: Return success response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific error types
    if (error instanceof NotFoundError) {
      const errorResponse: ApiErrorDTO = {
        error: "not_found",
        message: error.message,
        details: error.details,
      };

      await logError(supabase, "session_not_found", sessionId ?? null, error);

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof DatabaseError) {
      const errorResponse: ApiErrorDTO = {
        error: "database_error",
        message: "Database connection failed. How inconvenient. Please try again.",
        details: { timestamp: new Date().toISOString() },
      };

      await logError(supabase, "database_error", sessionId ?? null, error);

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    console.error("Unexpected error in GET /api/sessions/:sessionId/messages:", error);

    const errorResponse: ApiErrorDTO = {
      error: "internal_error",
      message: "An unexpected error occurred. The system has failed you.",
      details: { timestamp: new Date().toISOString() },
    };

    await logError(supabase, "unexpected_error", sessionId ?? null, error);

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// =============================================================================
// POST Handler - Send Message and Get AI Response
// =============================================================================

export const POST: APIRoute = async ({ params, request, locals }) => {
  const sessionId = params.sessionId;
  const supabase = locals.supabase;
  const startTime = Date.now();

  try {
    // Step 1: Validate session ID format
    if (!sessionId || !isValidUUID(sessionId)) {
      const error: ApiErrorDTO = {
        error: "validation_error",
        message: "Invalid session ID format.",
        details: { sessionId: "Must be a valid UUID" },
      };

      await logEvent(supabase, "warn", "validation_error", null, {
        endpoint: "POST /api/sessions/:sessionId/messages",
        error: "Invalid session ID",
      });

      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      const error: ApiErrorDTO = {
        error: "validation_error",
        message: "Invalid JSON in request body.",
        details: { body: "Must be valid JSON" },
      };

      await logEvent(supabase, "warn", "validation_error", sessionId, {
        endpoint: "POST /api/sessions/:sessionId/messages",
        error: "JSON parse error",
      });

      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let validatedBody;
    try {
      validatedBody = SendMessageBodySchema.parse(requestBody);
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        const error: ApiErrorDTO = {
          error: "validation_error",
          message: "Invalid request parameters provided.",
          details: zodError.flatten().fieldErrors,
        };

        await logEvent(supabase, "warn", "validation_error", sessionId, {
          endpoint: "POST /api/sessions/:sessionId/messages",
          errors: error.details,
        });

        return new Response(JSON.stringify(error), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Re-throw unexpected errors
      throw zodError;
    }

    // Step 3: Check session exists and not completed
    const session = await validateSessionActive(supabase, sessionId);

    // Step 4: Check idempotency
    const existingMessages = await checkIdempotency(supabase, sessionId, validatedBody.client_message_id);

    if (existingMessages) {
      // Return existing messages (idempotent response)
      const response = buildMessageResponseDTO(
        existingMessages.userMessage,
        existingMessages.assistantMessage,
        false // Completion already handled if it occurred
      );

      await logInfo(supabase, "idempotency_hit", sessionId, {
        endpoint: "POST /api/sessions/:sessionId/messages",
        client_message_id: validatedBody.client_message_id,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 5: Save user message
    const userMessage = await saveUserMessage(
      supabase,
      sessionId,
      validatedBody.chat_type,
      validatedBody.content,
      validatedBody.client_message_id
    );

    await logInfo(supabase, "message_received", sessionId, {
      endpoint: "POST /api/sessions/:sessionId/messages",
      chat_type: validatedBody.chat_type,
      message_id: userMessage.id,
      content_length: validatedBody.content.length,
    });

    // Step 6: Prepare AI prompt
    const prompt = await getPromptForChatType(
      supabase,
      sessionId,
      validatedBody.chat_type,
      session.scenario_id,
      validatedBody.content
    );

    // Step 7: Call Claude API
    let aiResponse;
    try {
      aiResponse = await callClaudeAPI(prompt, validatedBody.chat_type);
    } catch (apiError) {
      // Log API failure
      await logError(supabase, "api_call_failed", sessionId, apiError, {
        chat_type: validatedBody.chat_type,
      });

      // Return appropriate error response
      if (apiError instanceof ApiError) {
        const errorResponse: ApiErrorDTO = {
          error: apiError.details?.timeout_ms ? "api_timeout" : "api_failure",
          message: apiError.message,
          details: {
            ...apiError.details,
            user_message_saved: true, // User message was saved
            timestamp: new Date().toISOString(),
          },
        };

        return new Response(JSON.stringify(errorResponse), {
          status: apiError.details?.timeout_ms ? 504 : 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw apiError;
    }

    // Step 8: Log API call success
    await logApiCall(
      supabase,
      sessionId,
      validatedBody.chat_type,
      aiResponse.durationMs,
      aiResponse.usage,
      0 // Retry count (0 if first attempt succeeded)
    );

    // Step 9: Save AI assistant message
    const assistantMessage = await saveAssistantMessage(
      supabase,
      sessionId,
      validatedBody.chat_type,
      aiResponse.contentWithoutFlag
    );

    // Step 10: Complete session if needed (only for main chat)
    let sessionData;
    if (aiResponse.completionFlagDetected && validatedBody.chat_type === "main") {
      sessionData = await completeSession(supabase, sessionId);

      await logInfo(supabase, "scenario_completed", sessionId, {
        duration_seconds: sessionData.duration_seconds,
        message_count_main: sessionData.message_count_main,
        message_count_helper: sessionData.message_count_helper,
      });
    }

    // Step 11: Build and return response
    const response = buildMessageResponseDTO(
      userMessage,
      assistantMessage,
      aiResponse.completionFlagDetected,
      sessionData
    );

    const totalDuration = Date.now() - startTime;

    await logInfo(supabase, "message_processed", sessionId, {
      endpoint: "POST /api/sessions/:sessionId/messages",
      chat_type: validatedBody.chat_type,
      total_duration_ms: totalDuration,
      session_complete: aiResponse.completionFlagDetected,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific error types
    if (error instanceof NotFoundError) {
      const errorResponse: ApiErrorDTO = {
        error: "not_found",
        message: error.message,
        details: error.details,
      };

      await logError(supabase, "session_not_found", sessionId ?? null, error);

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof ConflictError) {
      const errorResponse: ApiErrorDTO = {
        error: "session_completed",
        message: error.message,
        details: error.details,
      };

      await logError(supabase, "session_completed", sessionId ?? null, error);

      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof DatabaseError) {
      const errorResponse: ApiErrorDTO = {
        error: "database_error",
        message: "A database operation failed. Your progress should be safe, but you may need to refresh.",
        details: { timestamp: new Date().toISOString() },
      };

      await logError(supabase, "database_error", sessionId ?? null, error);

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    console.error("Unexpected error in POST /api/sessions/:sessionId/messages:", error);

    const errorResponse: ApiErrorDTO = {
      error: "internal_error",
      message: "An unexpected error occurred. The system has failed you.",
      details: { timestamp: new Date().toISOString() },
    };

    await logError(supabase, "unexpected_error", sessionId ?? null, error);

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
