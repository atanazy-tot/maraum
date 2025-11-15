/**
 * Session Service
 *
 * Encapsulates all session-related business logic and database queries.
 * This service provides methods to retrieve session data from the database
 * and transform it into the appropriate DTO formats for API responses.
 *
 * Privacy Constraint: This service handles session data but delegates
 * message content handling to the messages service. Logging should only
 * include metadata (IDs, counts, timestamps), never message content.
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { SessionDTO, ScenarioEmbedDTO, MessageDTO } from "@/types";
import { DatabaseError } from "@/lib/errors";

/**
 * Retrieves a single session by its ID with optional message history.
 *
 * This function performs the following steps:
 * 1. Queries the sessions table by ID
 * 2. LEFT JOINs with scenarios table for embedded scenario data
 * 3. Conditionally LEFT JOINs with messages table if includeMessages=true
 * 4. Orders messages chronologically by sent_at (ascending)
 * 5. Transforms database result into SessionDTO format
 *
 * Query Optimization:
 * - Single query with JOINs is more efficient than multiple queries
 * - Uses database indexes: idx_sessions_user_lookup for sessions
 * - Uses idx_messages_session_chronological for messages ordering
 * - Conditional JOIN reduces payload when messages not needed
 *
 * @param supabase - Supabase client from context.locals
 * @param sessionId - UUID of the session to retrieve
 * @param includeMessages - Whether to include message history (default: true)
 * @returns Promise resolving to SessionDTO or null if session not found
 * @throws DatabaseError if database operations fail
 *
 * @example
 * ```typescript
 * // Get session with messages
 * const session = await getSessionById(supabase, sessionId, true);
 *
 * // Get session metadata only
 * const sessionMeta = await getSessionById(supabase, sessionId, false);
 * ```
 */
export async function getSessionById(
  supabase: SupabaseClient,
  sessionId: string,
  includeMessages = true
): Promise<SessionDTO | null> {
  try {
    // Build the select query with scenario embedding
    // Note: Supabase uses special syntax for foreign key relationships
    let selectClause = `
      id,
      user_id,
      scenario_id,
      is_completed,
      started_at,
      last_activity_at,
      completed_at,
      message_count_main,
      message_count_helper,
      duration_seconds,
      scenario:scenarios(id, title, emoji)
    `;

    // Conditionally add messages if requested
    if (includeMessages) {
      selectClause += `,
      messages(id, role, chat_type, content, sent_at)
      `;
    }

    // Execute query with .single() to expect exactly one result
    let query = supabase.from("sessions").select(selectClause).eq("id", sessionId);

    // Add message ordering if messages are included
    // This ensures messages are returned in chronological order
    if (includeMessages) {
      query = query.order("sent_at", { foreignTable: "messages", ascending: true });
    }

    const { data, error } = await query.single();

    if (error) {
      // PGRST116 = no rows returned by .single()
      // This is expected when session doesn't exist, so return null
      if (error.code === "PGRST116") {
        return null;
      }

      // Any other database error is unexpected
      throw new DatabaseError("Failed to fetch session from database", {
        session_id: sessionId,
        include_messages: includeMessages,
        error_code: error.code,
        error_message: error.message,
      });
    }

    // Handle case where data is null (shouldn't happen, but TypeScript safety)
    if (!data) {
      return null;
    }

    // Transform database result to SessionDTO format
    // The database returns scenario as an object, we need to extract it
    const session: SessionDTO = {
      id: data.id,
      user_id: data.user_id,
      scenario_id: data.scenario_id,
      scenario: data.scenario as ScenarioEmbedDTO,
      is_completed: data.is_completed,
      started_at: data.started_at,
      last_activity_at: data.last_activity_at,
      completed_at: data.completed_at,
      message_count_main: data.message_count_main,
      message_count_helper: data.message_count_helper,
      duration_seconds: data.duration_seconds,
    };

    // Add messages array if they were included
    // Note: Only add the messages property if includeMessages was true
    // This ensures the response structure matches expectations
    if (includeMessages && data.messages) {
      session.messages = data.messages as MessageDTO[];
    }

    return session;
  } catch (error) {
    // Re-throw DatabaseError as-is
    if (error instanceof DatabaseError) {
      throw error;
    }

    // Wrap any other unexpected errors
    throw new DatabaseError("Unexpected error while fetching session", {
      session_id: sessionId,
      include_messages: includeMessages,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
