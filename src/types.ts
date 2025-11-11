/**
 * API DTO Types and Command Models for Maraum MVP
 *
 * This file contains all Data Transfer Object (DTO) types and Command Models
 * used in the REST API. All types are derived from the database entity definitions
 * to ensure type safety and consistency between the database layer and API layer.
 *
 * Organization:
 * - Type Aliases: Convenient aliases for database enums
 * - Scenario DTOs: Types for scenario-related endpoints
 * - Session DTOs: Types for session-related endpoints
 * - Message DTOs: Types for message-related endpoints
 * - Supporting Types: Pagination, health check, and error types
 * - Command Models: Request payload types for API mutations
 */

import type { Tables, Enums } from "./db/database.types";

// =============================================================================
// Type Aliases for Database Enums
// =============================================================================

/**
 * Chat type enum - determines which chat panel a message belongs to
 * - "main": Left panel (魔), German scenario chat
 * - "helper": Right panel (間), English helper chat
 */
export type ChatType = Enums<"chat_type_enum">;

/**
 * Message role enum - identifies the sender of a message
 * - "user": Human user message
 * - "main_assistant": AI NPC in German scenario chat
 * - "helper_assistant": AI companion in English helper chat
 */
export type MessageRole = Enums<"message_role">;

// =============================================================================
// Scenario DTOs
// =============================================================================

/**
 * ScenarioListItemDTO
 * Used in: GET /api/scenarios (list all scenarios)
 *
 * Contains all information needed to display scenarios in the scenario
 * selection interface, including initial messages for immediate session start.
 */
export type ScenarioListItemDTO = Pick<
  Tables<"scenarios">,
  | "id"
  | "title"
  | "emoji"
  | "sort_order"
  | "is_active"
  | "initial_message_main"
  | "initial_message_helper"
>;

/**
 * ScenarioDetailDTO
 * Used in: GET /api/scenarios/:scenarioId (get single scenario)
 *
 * Complete scenario information including timestamps. Extends the list item
 * with audit fields.
 */
export type ScenarioDetailDTO = Tables<"scenarios">;

/**
 * ScenarioEmbedDTO
 * Used in: Embedded in session responses
 *
 * Minimal scenario information for display alongside session data.
 * Includes only the essential fields needed for UI display.
 */
export type ScenarioEmbedDTO = Pick<
  Tables<"scenarios">,
  "id" | "title" | "emoji"
>;

/**
 * ScenariosListResponseDTO
 * Used in: GET /api/scenarios response wrapper
 *
 * Response wrapper for the scenarios list endpoint.
 */
export type ScenariosListResponseDTO = {
  scenarios: ScenarioListItemDTO[];
};

// =============================================================================
// Session DTOs
// =============================================================================

/**
 * SessionDTO
 * Used in: GET /api/sessions/:sessionId (get session with optional messages)
 *
 * Complete session information including embedded scenario data and optional
 * message history. The updated_at field is omitted as it's an internal audit
 * field not exposed to the API.
 */
export type SessionDTO = Omit<Tables<"sessions">, "updated_at"> & {
  scenario: ScenarioEmbedDTO;
  messages?: MessageDTO[];
};

/**
 * SessionCreatedDTO
 * Used in: POST /api/sessions response (session creation)
 *
 * Response for newly created session, including the initial messages that
 * were automatically created from the scenario configuration.
 */
export type SessionCreatedDTO = Omit<SessionDTO, "messages"> & {
  initial_messages: MessageDTO[];
};

/**
 * SessionCompletionDTO
 * Used in: PATCH /api/sessions/:sessionId/complete response,
 *          Also embedded in MessageResponseDTO when session completes
 *
 * Contains completion-specific information about a session.
 * Includes the final message counts and duration.
 */
export type SessionCompletionDTO = Pick<
  Tables<"sessions">,
  | "id"
  | "is_completed"
  | "completed_at"
  | "duration_seconds"
  | "message_count_main"
  | "message_count_helper"
>;

// =============================================================================
// Message DTOs
// =============================================================================

/**
 * MessageDTO
 * Used in: All message-related responses
 *
 * Basic message structure containing the essential fields for displaying
 * a message in the UI. Does not include internal fields like user_id,
 * client_message_id, or created_at.
 */
export type MessageDTO = Pick<
  Tables<"messages">,
  "id" | "role" | "chat_type" | "content" | "sent_at"
>;

/**
 * MessageWithSessionDTO
 * Used in: GET /api/sessions/:sessionId/messages response
 *
 * Extended message information that includes the session_id for context.
 * Useful when retrieving messages independently of a session context.
 */
export type MessageWithSessionDTO = MessageDTO & {
  session_id: string;
};

/**
 * MessageResponseDTO
 * Used in: POST /api/sessions/:sessionId/messages response
 *
 * Response from sending a message, containing both the user's message and
 * the AI assistant's response. Includes session completion information
 * when the scenario is completed.
 *
 * Fields:
 * - user_message: The message sent by the user
 * - assistant_message: The AI response
 * - session_complete: Whether this exchange completed the session
 * - completion_flag_detected: Whether the AI included the completion flag
 * - session: Completion details (only present if session_complete is true)
 */
export type MessageResponseDTO = {
  user_message: MessageDTO;
  assistant_message: MessageDTO;
  session_complete: boolean;
  completion_flag_detected: boolean;
  session?: SessionCompletionDTO;
};

/**
 * MessagesListResponseDTO
 * Used in: GET /api/sessions/:sessionId/messages response
 *
 * Response wrapper for message list endpoint, including pagination metadata.
 */
export type MessagesListResponseDTO = {
  messages: MessageWithSessionDTO[];
  pagination: PaginationDTO;
};

// =============================================================================
// Supporting Types
// =============================================================================

/**
 * PaginationDTO
 * Used in: Paginated list responses
 *
 * Standard pagination metadata for list endpoints.
 *
 * Fields:
 * - limit: Number of items per page
 * - offset: Starting position in the full result set
 * - total: Total number of items available
 * - has_more: Whether there are more items beyond this page
 */
export type PaginationDTO = {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
};

/**
 * HealthCheckServicesDTO
 * Used in: GET /api/health response
 *
 * Status of individual services/dependencies.
 * Index signature allows for future service additions.
 */
export type HealthCheckServicesDTO = {
  database: "connected" | "error";
  [key: string]: string;
};

/**
 * HealthCheckDTO
 * Used in: GET /api/health response
 *
 * Overall health status of the API service.
 *
 * Fields:
 * - status: "healthy" if all services operational, "unhealthy" otherwise
 * - timestamp: ISO 8601 timestamp of the health check
 * - services: Individual service statuses
 */
export type HealthCheckDTO = {
  status: "healthy" | "unhealthy";
  timestamp: string;
  services: HealthCheckServicesDTO;
};

/**
 * ApiErrorDTO
 * Used in: All error responses
 *
 * Standard error response format for the API.
 *
 * Fields:
 * - error: Machine-readable error code (e.g., "not_found", "validation_error")
 * - message: Human-readable error message (often in helper's voice)
 * - details: Optional additional context about the error
 *
 * Common error codes:
 * - "not_found" (404)
 * - "validation_error" (400)
 * - "session_completed" (409)
 * - "api_timeout" (504)
 * - "api_failure" (500)
 * - "database_error" (500)
 */
export type ApiErrorDTO = {
  error: string;
  message: string;
  details?: Record<string, any>;
};

// =============================================================================
// Command Models (Request Payloads)
// =============================================================================

/**
 * CreateSessionCommand
 * Used in: POST /api/sessions request body
 *
 * Command to create a new session for a specific scenario.
 *
 * Validation:
 * - scenario_id must exist in scenarios table
 * - scenario must be active (is_active = true)
 */
export type CreateSessionCommand = {
  scenario_id: number;
};

/**
 * SendMessageCommand
 * Used in: POST /api/sessions/:sessionId/messages request body
 *
 * Command to send a user message and receive an AI response.
 *
 * Validation:
 * - chat_type must be "main" or "helper"
 * - content must be non-empty and <= 8000 characters
 * - client_message_id is optional but recommended for idempotency
 *
 * Fields:
 * - chat_type: Which chat panel to send the message to
 * - content: The message text
 * - client_message_id: Optional UUID for idempotency (prevents duplicate processing)
 */
export type SendMessageCommand = {
  chat_type: ChatType;
  content: string;
  client_message_id?: string;
};
