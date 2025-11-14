/**
 * Logging Service
 *
 * Provides structured logging functionality with integration to the database logs table.
 * This service ensures privacy-compliant logging (NO message content) and consistent
 * logging patterns across the application.
 *
 * Privacy Constraint: NEVER log message content, only metadata (IDs, counts, timestamps).
 */

import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Log level enum - matches database CHECK constraint
 */
export type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Event type enum - matches database CHECK constraint
 * Defines all valid event types that can be logged
 */
export type LogEventType =
  // API Events
  | "api_call_started"
  | "api_call_completed"
  | "api_call_failed"
  | "api_call_timeout"
  | "api_retry_attempted"
  // Authentication Events
  | "user_registered"
  | "user_login_success"
  | "user_login_failed"
  | "user_logout"
  | "session_expired"
  | "account_deleted"
  // Scenario Events
  | "scenario_started"
  | "scenario_completed"
  | "scenario_abandoned"
  // Session Events
  | "session_created"
  | "session_restored"
  | "session_expiration_cleanup"
  // Rate Limiting
  | "rate_limit_checked"
  | "rate_limit_exceeded"
  | "weekly_limit_reset"
  // System Events
  | "database_error"
  | "cleanup_job_executed"
  | "unknown_error";

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  event_type: LogEventType;
  user_id?: string | null;
  session_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an event to the database logs table
 *
 * This function inserts a log entry into the database with the provided details.
 * It handles errors gracefully by catching any database failures and logging them
 * to console as a fallback (to avoid infinite logging loops).
 *
 * Privacy Note: The metadata object should NEVER contain message content,
 * user passwords, tokens, or other sensitive information. Only include
 * operational metadata like IDs, counts, timestamps, error codes.
 *
 * @param supabase - Supabase client from context.locals
 * @param entry - The log entry to record
 * @returns Promise resolving to true if successful, false if failed
 *
 * @example
 * ```typescript
 * await logEvent(supabase, {
 *   level: 'info',
 *   event_type: 'session_created',
 *   session_id: sessionId,
 *   metadata: {
 *     scenario_id: 1,
 *     message_count: 2
 *   }
 * });
 * ```
 */
export async function logEvent(supabase: SupabaseClient, entry: LogEntry): Promise<boolean> {
  try {
    const { error } = await supabase.from("logs").insert({
      level: entry.level,
      event_type: entry.event_type,
      user_id: entry.user_id || null,
      session_id: entry.session_id || null,
      metadata: entry.metadata || null,
    });

    if (error) {
      // Fallback to console logging if database insert fails
      console.error("Failed to log event to database:", {
        event_type: entry.event_type,
        level: entry.level,
        error: error.message,
      });
      return false;
    }

    return true;
  } catch (error) {
    // Catch any unexpected errors and log to console as fallback
    console.error("Unexpected error in logEvent:", {
      event_type: entry.event_type,
      level: entry.level,
      error,
    });
    return false;
  }
}

/**
 * Convenience function for logging errors
 *
 * @param supabase - Supabase client
 * @param event_type - The type of error event
 * @param metadata - Additional error context
 * @param session_id - Optional session ID
 * @param user_id - Optional user ID
 */
export async function logError(
  supabase: SupabaseClient,
  event_type: LogEventType,
  metadata?: Record<string, unknown>,
  session_id?: string | null,
  user_id?: string | null
): Promise<void> {
  await logEvent(supabase, {
    level: "error",
    event_type,
    metadata,
    session_id,
    user_id,
  });
}

/**
 * Convenience function for logging informational events
 *
 * @param supabase - Supabase client
 * @param event_type - The type of info event
 * @param metadata - Additional event context
 * @param session_id - Optional session ID
 * @param user_id - Optional user ID
 */
export async function logInfo(
  supabase: SupabaseClient,
  event_type: LogEventType,
  metadata?: Record<string, unknown>,
  session_id?: string | null,
  user_id?: string | null
): Promise<void> {
  await logEvent(supabase, {
    level: "info",
    event_type,
    metadata,
    session_id,
    user_id,
  });
}

/**
 * Convenience function for logging warnings
 *
 * @param supabase - Supabase client
 * @param event_type - The type of warning event
 * @param metadata - Additional warning context
 * @param session_id - Optional session ID
 * @param user_id - Optional user ID
 */
export async function logWarn(
  supabase: SupabaseClient,
  event_type: LogEventType,
  metadata?: Record<string, unknown>,
  session_id?: string | null,
  user_id?: string | null
): Promise<void> {
  await logEvent(supabase, {
    level: "warn",
    event_type,
    metadata,
    session_id,
    user_id,
  });
}

/**
 * Convenience function for logging debug events
 *
 * @param supabase - Supabase client
 * @param event_type - The type of debug event
 * @param metadata - Additional debug context
 * @param session_id - Optional session ID
 * @param user_id - Optional user ID
 */
export async function logDebug(
  supabase: SupabaseClient,
  event_type: LogEventType,
  metadata?: Record<string, unknown>,
  session_id?: string | null,
  user_id?: string | null
): Promise<void> {
  await logEvent(supabase, {
    level: "debug",
    event_type,
    metadata,
    session_id,
    user_id,
  });
}
