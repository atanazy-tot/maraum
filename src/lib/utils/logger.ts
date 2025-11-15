/**
 * Logging Utility
 *
 * Provides structured logging to the database for operational events,
 * errors, and audit trails. All logs are stored in the `logs` table
 * with automatic 30-day retention.
 *
 * IMPORTANT PRIVACY CONSTRAINT:
 * - NEVER log message content (violates privacy requirements)
 * - ONLY log metadata: IDs, counts, timestamps, durations, error types
 * - Message content must remain private and never appear in logs
 *
 * Log Levels:
 * - info: Normal operational events (successful requests, API calls)
 * - warn: Validation errors, expected failures (400-level errors)
 * - error: Unexpected failures, system errors (500-level errors)
 */

import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Log level enum
 */
export type LogLevel = "info" | "warn" | "error";

/**
 * Generic log event function
 *
 * Logs an event to the database with the specified level, event type,
 * and metadata. This is the base function used by all other logging functions.
 *
 * @param supabase - Supabase client from context.locals
 * @param level - Log level (info, warn, error)
 * @param eventType - Machine-readable event type (e.g., 'messages_retrieved', 'validation_error')
 * @param sessionId - Optional session ID for context
 * @param metadata - Additional contextual information (never include message content)
 *
 * @example
 * ```typescript
 * await logEvent(supabase, 'info', 'messages_retrieved', sessionId, {
 *   endpoint: '/api/sessions/:sessionId/messages',
 *   message_count: 42,
 *   chat_type: 'main'
 * });
 * ```
 */
export async function logEvent(
  supabase: SupabaseClient,
  level: LogLevel,
  eventType: string,
  sessionId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    // Add timestamp to metadata
    const enrichedMetadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
    };

    // Insert log entry into database
    const { error } = await supabase.from("logs").insert({
      level,
      event_type: eventType,
      session_id: sessionId,
      user_id: null, // No auth in MVP, will be populated post-MVP
      metadata: enrichedMetadata,
    });

    if (error) {
      // Log to console if database logging fails (last resort)
      console.error("Failed to log event to database:", error);
      console.error("Event details:", { level, eventType, sessionId, metadata });
    }
  } catch (error) {
    // Catch any unexpected errors during logging
    console.error("Unexpected error in logEvent:", error);
    console.error("Event details:", { level, eventType, sessionId, metadata });
  }
}

/**
 * Log an error event
 *
 * Convenience function for logging errors with consistent formatting.
 * Automatically sets level to 'error' and extracts error message.
 *
 * @param supabase - Supabase client from context.locals
 * @param eventType - Type of error (e.g., 'database_error', 'api_timeout')
 * @param sessionId - Optional session ID for context
 * @param error - The error object or unknown value
 * @param additionalMetadata - Optional additional context
 *
 * @example
 * ```typescript
 * try {
 *   // ... database operation
 * } catch (error) {
 *   await logError(supabase, 'database_error', sessionId, error, {
 *     operation: 'fetch_messages'
 *   });
 * }
 * ```
 */
export async function logError(
  supabase: SupabaseClient,
  eventType: string,
  sessionId: string | null,
  error: unknown,
  additionalMetadata?: Record<string, unknown>
): Promise<void> {
  // Extract error message safely
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Combine error message with additional metadata
  const metadata = {
    error_message: errorMessage,
    ...additionalMetadata,
  };

  await logEvent(supabase, "error", eventType, sessionId, metadata);
}

/**
 * Log a warning event
 *
 * Convenience function for logging warnings (e.g., validation errors).
 * Automatically sets level to 'warn'.
 *
 * @param supabase - Supabase client from context.locals
 * @param eventType - Type of warning (e.g., 'validation_error', 'invalid_input')
 * @param sessionId - Optional session ID for context
 * @param metadata - Contextual information about the warning
 *
 * @example
 * ```typescript
 * await logWarning(supabase, 'validation_error', sessionId, {
 *   endpoint: '/api/sessions/:sessionId/messages',
 *   errors: { chat_type: 'invalid value' }
 * });
 * ```
 */
export async function logWarning(
  supabase: SupabaseClient,
  eventType: string,
  sessionId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  await logEvent(supabase, "warn", eventType, sessionId, metadata);
}

/**
 * Log an info event
 *
 * Convenience function for logging informational events.
 * Automatically sets level to 'info'.
 *
 * @param supabase - Supabase client from context.locals
 * @param eventType - Type of event (e.g., 'messages_retrieved', 'session_created')
 * @param sessionId - Optional session ID for context
 * @param metadata - Contextual information about the event
 *
 * @example
 * ```typescript
 * await logInfo(supabase, 'messages_retrieved', sessionId, {
 *   endpoint: '/api/sessions/:sessionId/messages',
 *   message_count: response.messages.length,
 *   limit: query.limit
 * });
 * ```
 */
export async function logInfo(
  supabase: SupabaseClient,
  eventType: string,
  sessionId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  await logEvent(supabase, "info", eventType, sessionId, metadata);
}

/**
 * Log an API call event
 *
 * Specialized function for logging external API calls (e.g., Claude API).
 * Includes timing, token usage, and retry information.
 *
 * @param supabase - Supabase client from context.locals
 * @param sessionId - Session ID for context
 * @param chatType - Which chat panel ('main' or 'helper')
 * @param durationMs - API call duration in milliseconds
 * @param tokens - Token usage information (input and output)
 * @param retryCount - Number of retries attempted (0 if first attempt succeeded)
 *
 * @example
 * ```typescript
 * await logApiCall(supabase, sessionId, 'main', 3250, {
 *   input_tokens: 1500,
 *   output_tokens: 800
 * }, 0);
 * ```
 */
export async function logApiCall(
  supabase: SupabaseClient,
  sessionId: string,
  chatType: "main" | "helper",
  durationMs: number,
  tokens: { input_tokens: number; output_tokens: number },
  retryCount: number
): Promise<void> {
  await logEvent(supabase, "info", "api_call_completed", sessionId, {
    chat_type: chatType,
    duration_ms: durationMs,
    input_tokens: tokens.input_tokens,
    output_tokens: tokens.output_tokens,
    retry_count: retryCount,
  });
}
