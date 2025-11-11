/**
 * Messages Service
 *
 * Encapsulates all message-related business logic and database queries.
 * This service provides methods to retrieve and manage messages for sessions,
 * including support for filtering, pagination, and sorting.
 *
 * Privacy Constraint: This service handles message content but NEVER logs it.
 * Only metadata (IDs, counts, timestamps) may be logged.
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type {
  MessageWithSessionDTO,
  MessagesListResponseDTO,
  PaginationDTO,
  MessageDTO,
  MessageResponseDTO,
  SessionCompletionDTO,
  ChatType,
  MessageRole,
} from "@/types";
import type { GetMessagesQuery } from "@/lib/validation/messages.validation";
import { NotFoundError, DatabaseError, ConflictError } from "@/lib/errors";

/**
 * Retrieves messages for a specific session with filtering, pagination, and sorting.
 *
 * This function performs the following steps:
 * 1. Validates that the session exists
 * 2. Builds and executes a query to retrieve messages with filters
 * 3. Executes a count query for pagination metadata
 * 4. Constructs and returns the response with pagination information
 *
 * Query Optimization:
 * - Uses indexed columns (session_id, chat_type, sent_at, id)
 * - Separate count query for accuracy
 * - Stable sorting with id as tiebreaker
 *
 * @param supabase - Supabase client from context.locals
 * @param sessionId - UUID of the session to retrieve messages for
 * @param query - Validated query parameters (chat_type, limit, offset, order)
 * @returns Promise resolving to messages list with pagination metadata
 * @throws NotFoundError if session doesn't exist
 * @throws DatabaseError if database operations fail
 *
 * @example
 * ```typescript
 * const response = await getSessionMessages(supabase, sessionId, {
 *   chat_type: 'main',
 *   limit: 50,
 *   offset: 0,
 *   order: 'asc'
 * });
 * console.log(response.messages.length); // 50
 * console.log(response.pagination.has_more); // true
 * ```
 */
export async function getSessionMessages(
  supabase: SupabaseClient,
  sessionId: string,
  query: GetMessagesQuery
): Promise<MessagesListResponseDTO> {
  // Step 1: Check if session exists
  // This prevents unnecessary queries and provides clear error messaging
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .single();

  if (sessionError) {
    // PGRST116 = no rows returned by .single()
    if (sessionError.code === "PGRST116") {
      throw new NotFoundError("Session not found. Perhaps it wandered off?", {
        session_id: sessionId,
      });
    }
    // Other database errors
    throw new DatabaseError("Failed to verify session existence.", {
      session_id: sessionId,
      error: sessionError.message,
    });
  }

  if (!session) {
    throw new NotFoundError("Session not found. Perhaps it wandered off?", {
      session_id: sessionId,
    });
  }

  // Step 2: Build messages query with filters
  let messagesQuery = supabase
    .from("messages")
    .select("id, session_id, role, chat_type, content, sent_at")
    .eq("session_id", sessionId);

  // Add chat_type filter if not 'all'
  if (query.chat_type !== "all") {
    messagesQuery = messagesQuery.eq("chat_type", query.chat_type);
  }

  // Add ordering (by sent_at and id for stable sort)
  // Using id as secondary sort ensures consistent pagination even when
  // messages have identical timestamps
  messagesQuery = messagesQuery
    .order("sent_at", { ascending: query.order === "asc" })
    .order("id", { ascending: query.order === "asc" });

  // Add pagination using range (Supabase uses inclusive ranges)
  // range(0, 9) returns 10 items (indices 0-9)
  messagesQuery = messagesQuery.range(
    query.offset,
    query.offset + query.limit - 1
  );

  // Step 3: Execute messages query
  const { data: messages, error: messagesError } = await messagesQuery;

  if (messagesError) {
    throw new DatabaseError("Failed to retrieve messages.", {
      session_id: sessionId,
      error: messagesError.message,
    });
  }

  // Step 4: Get total count with same filters
  // Using separate count query for accuracy
  let countQuery = supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (query.chat_type !== "all") {
    countQuery = countQuery.eq("chat_type", query.chat_type);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    throw new DatabaseError("Failed to count messages.", {
      session_id: sessionId,
      error: countError.message,
    });
  }

  const total = count ?? 0;

  // Step 5: Build pagination metadata
  const pagination: PaginationDTO = {
    limit: query.limit,
    offset: query.offset,
    total,
    has_more: query.offset + messages.length < total,
  };

  // Step 6: Transform and return response
  // Map database rows to DTO format
  const messagesWithSession: MessageWithSessionDTO[] = messages.map((msg) => ({
    id: msg.id,
    session_id: msg.session_id,
    role: msg.role,
    chat_type: msg.chat_type,
    content: msg.content,
    sent_at: msg.sent_at,
  }));

  return {
    messages: messagesWithSession,
    pagination,
  };
}

// =============================================================================
// POST Endpoint Functions
// =============================================================================

/**
 * Checks if a message with the given client_message_id already exists (idempotency check)
 *
 * This function prevents duplicate message processing when clients retry requests.
 * If a message with the same client_message_id exists, returns both the user message
 * and the corresponding assistant response.
 *
 * @param supabase - Supabase client from context.locals
 * @param sessionId - UUID of the session
 * @param clientMessageId - Client-provided idempotency key
 * @returns Promise resolving to existing messages or null if not found
 * @throws DatabaseError if database operations fail
 */
export async function checkIdempotency(
  supabase: SupabaseClient,
  sessionId: string,
  clientMessageId: string | undefined
): Promise<{ userMessage: MessageDTO; assistantMessage: MessageDTO } | null> {
  // If no client_message_id provided, skip idempotency check
  if (!clientMessageId) {
    return null;
  }

  // Find user message with this client_message_id
  const { data: userMessage, error: userError } = await supabase
    .from("messages")
    .select("id, role, chat_type, content, sent_at")
    .eq("session_id", sessionId)
    .eq("client_message_id", clientMessageId)
    .eq("role", "user")
    .single();

  if (userError) {
    // PGRST116 = no rows returned (message doesn't exist, proceed normally)
    if (userError.code === "PGRST116") {
      return null;
    }
    throw new DatabaseError("Failed to check message idempotency", {
      session_id: sessionId,
      client_message_id: clientMessageId,
      error: userError.message,
    });
  }

  if (!userMessage) {
    return null;
  }

  // Find the assistant message that came after this user message
  const { data: assistantMessage, error: assistantError } = await supabase
    .from("messages")
    .select("id, role, chat_type, content, sent_at")
    .eq("session_id", sessionId)
    .eq("chat_type", userMessage.chat_type)
    .neq("role", "user")
    .gt("sent_at", userMessage.sent_at)
    .order("sent_at", { ascending: true })
    .limit(1)
    .single();

  if (assistantError) {
    // If no assistant message found, this is a partial state (should be rare)
    // Return null to allow re-processing
    if (assistantError.code === "PGRST116") {
      return null;
    }
    throw new DatabaseError("Failed to fetch assistant message for idempotency", {
      session_id: sessionId,
      user_message_id: userMessage.id,
      error: assistantError.message,
    });
  }

  // Return both messages
  return {
    userMessage: userMessage as MessageDTO,
    assistantMessage: assistantMessage as MessageDTO,
  };
}

/**
 * Validates that session exists and is not completed
 *
 * @param supabase - Supabase client from context.locals
 * @param sessionId - UUID of the session
 * @returns Promise resolving to session data with scenario_id
 * @throws NotFoundError if session doesn't exist
 * @throws ConflictError if session is already completed
 * @throws DatabaseError if database operations fail
 */
export async function validateSessionActive(
  supabase: SupabaseClient,
  sessionId: string
): Promise<{ scenario_id: number; is_completed: boolean; completed_at: string | null }> {
  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, scenario_id, is_completed, completed_at")
    .eq("id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new NotFoundError(
        "The requested session could not be found. Perhaps it never existed, or it was deleted.",
        { session_id: sessionId }
      );
    }
    throw new DatabaseError("Failed to fetch session", {
      session_id: sessionId,
      error: error.message,
    });
  }

  if (session.is_completed) {
    throw new ConflictError(
      "Cannot send messages to completed session. This conversation has concluded.",
      {
        session_id: sessionId,
        completed_at: session.completed_at,
      }
    );
  }

  return session;
}

/**
 * Saves user message to database
 *
 * @param supabase - Supabase client from context.locals
 * @param sessionId - UUID of the session
 * @param chatType - Which chat panel ('main' or 'helper')
 * @param content - The message text
 * @param clientMessageId - Optional idempotency key
 * @returns Promise resolving to saved message DTO
 * @throws DatabaseError if database operations fail
 */
export async function saveUserMessage(
  supabase: SupabaseClient,
  sessionId: string,
  chatType: ChatType,
  content: string,
  clientMessageId?: string
): Promise<MessageDTO> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      session_id: sessionId,
      user_id: null, // No auth in MVP
      role: "user",
      chat_type: chatType,
      content,
      client_message_id: clientMessageId || null,
    })
    .select("id, role, chat_type, content, sent_at")
    .single();

  if (error) {
    throw new DatabaseError("Failed to save user message", {
      session_id: sessionId,
      chat_type: chatType,
      error: error.message,
    });
  }

  return data as MessageDTO;
}

/**
 * Saves assistant message to database
 *
 * @param supabase - Supabase client from context.locals
 * @param sessionId - UUID of the session
 * @param chatType - Which chat panel ('main' or 'helper')
 * @param content - The AI-generated response text
 * @returns Promise resolving to saved message DTO
 * @throws DatabaseError if database operations fail
 */
export async function saveAssistantMessage(
  supabase: SupabaseClient,
  sessionId: string,
  chatType: ChatType,
  content: string
): Promise<MessageDTO> {
  // Determine role based on chat type
  const role: MessageRole = chatType === "main" ? "main_assistant" : "helper_assistant";

  const { data, error } = await supabase
    .from("messages")
    .insert({
      session_id: sessionId,
      user_id: null, // No auth in MVP
      role,
      chat_type: chatType,
      content,
      client_message_id: null, // Only user messages have client_message_id
    })
    .select("id, role, chat_type, content, sent_at")
    .single();

  if (error) {
    throw new DatabaseError("Failed to save assistant message", {
      session_id: sessionId,
      chat_type: chatType,
      error: error.message,
    });
  }

  return data as MessageDTO;
}

/**
 * Marks session as completed and returns completion data
 *
 * This function:
 * 1. Sets is_completed = true
 * 2. Sets completed_at = NOW()
 * 3. Calculates duration_seconds from started_at to NOW()
 * 4. Returns completion data for response
 *
 * @param supabase - Supabase client from context.locals
 * @param sessionId - UUID of the session
 * @returns Promise resolving to session completion DTO
 * @throws DatabaseError if database operations fail
 */
export async function completeSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<SessionCompletionDTO> {
  // Update session to mark as completed
  // The database will automatically calculate duration_seconds via SQL
  const { data, error } = await supabase
    .from("sessions")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select("id, is_completed, completed_at, duration_seconds, message_count_main, message_count_helper")
    .single();

  if (error) {
    throw new DatabaseError("Failed to complete session", {
      session_id: sessionId,
      error: error.message,
    });
  }

  return data as SessionCompletionDTO;
}

/**
 * Builds the response DTO for send message endpoint
 *
 * @param userMessage - The user's message that was sent
 * @param assistantMessage - The AI's response
 * @param completionFlagDetected - Whether scenario completion flag was detected
 * @param sessionData - Optional session completion data (only if completed)
 * @returns MessageResponseDTO with both messages and completion status
 */
export function buildMessageResponseDTO(
  userMessage: MessageDTO,
  assistantMessage: MessageDTO,
  completionFlagDetected: boolean,
  sessionData?: SessionCompletionDTO
): MessageResponseDTO {
  return {
    user_message: userMessage,
    assistant_message: assistantMessage,
    session_complete: completionFlagDetected,
    completion_flag_detected: completionFlagDetected,
    session: sessionData,
  };
}
