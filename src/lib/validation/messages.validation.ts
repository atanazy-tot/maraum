/**
 * Messages Validation Schemas
 *
 * Zod schemas for validating message-related inputs in API endpoints.
 * Includes validation for both GET (list) and POST (send) message operations.
 */

import { z } from "zod";

/**
 * UUID validation regex pattern (RFC 4122 compliant)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Helper function to validate UUID format
 */
export const isValidUUID = (value: string): boolean => {
  return UUID_REGEX.test(value);
};

// =============================================================================
// GET /api/sessions/:sessionId/messages - Query Parameters
// =============================================================================

/**
 * Schema for validating query parameters when retrieving messages.
 *
 * Query parameters:
 * - chat_type: Filter by 'main', 'helper', or 'all' (default: 'all')
 * - limit: Number of messages to return, 1-500 (default: 100)
 * - offset: Number of messages to skip for pagination (default: 0)
 * - order: Sort order by sent_at timestamp, 'asc' or 'desc' (default: 'asc')
 *
 * Example valid inputs:
 * - {} (empty object uses all defaults)
 * - { chat_type: 'main', limit: '50', offset: '0', order: 'desc' }
 * - { limit: 10 } (numbers are also accepted, coerced from strings)
 */
export const GetMessagesQuerySchema = z.object({
  chat_type: z
    .enum(["main", "helper", "all"], {
      errorMap: () => ({ message: "chat_type must be 'main', 'helper', or 'all'" }),
    })
    .default("all"),
  limit: z.coerce
    .number({
      invalid_type_error: "limit must be a number",
    })
    .int({ message: "limit must be an integer" })
    .min(1, { message: "limit must be at least 1" })
    .max(500, { message: "limit cannot exceed 500" })
    .default(100),
  offset: z.coerce
    .number({
      invalid_type_error: "offset must be a number",
    })
    .int({ message: "offset must be an integer" })
    .min(0, { message: "offset cannot be negative" })
    .default(0),
  order: z
    .enum(["asc", "desc"], {
      errorMap: () => ({ message: "order must be 'asc' or 'desc'" }),
    })
    .default("asc"),
});

/**
 * Inferred TypeScript type for GET messages query parameters
 */
export type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;

// =============================================================================
// POST /api/sessions/:sessionId/messages - Path Parameters
// =============================================================================

/**
 * Schema for validating session ID path parameter.
 *
 * Ensures the session ID is a valid UUID format.
 * This is used for both GET and POST endpoints.
 */
export const SendMessageParamsSchema = z.object({
  sessionId: z.string().uuid({ message: "Invalid session ID format" }),
});

/**
 * Inferred TypeScript type for send message path parameters
 */
export type SendMessageParams = z.infer<typeof SendMessageParamsSchema>;

// =============================================================================
// POST /api/sessions/:sessionId/messages - Request Body
// =============================================================================

/**
 * Schema for validating request body when sending a message.
 *
 * Body fields:
 * - chat_type: Which chat panel to send to ('main' or 'helper')
 * - content: The message text (1-8000 characters)
 * - client_message_id: Optional UUID for idempotency
 *
 * Example valid inputs:
 * - { chat_type: 'main', content: 'Guten Tag!' }
 * - { chat_type: 'helper', content: 'How do I say...?', client_message_id: 'uuid...' }
 *
 * Invalid examples:
 * - { chat_type: 'invalid', content: 'text' } - invalid chat_type
 * - { chat_type: 'main', content: '' } - empty content
 * - { chat_type: 'main', content: '...' } - content too long (>8000 chars)
 * - { chat_type: 'main', content: 'text', client_message_id: 'not-uuid' } - invalid UUID
 */
export const SendMessageBodySchema = z.object({
  chat_type: z.enum(["main", "helper"], {
    errorMap: () => ({ message: "chat_type must be 'main' or 'helper'" }),
  }),
  content: z
    .string({ required_error: "content is required" })
    .min(1, { message: "content cannot be empty" })
    .max(8000, { message: "content cannot exceed 8000 characters" }),
  client_message_id: z.string().uuid({ message: "client_message_id must be a valid UUID" }).optional(),
});

/**
 * Inferred TypeScript type for send message request body
 */
export type SendMessageBody = z.infer<typeof SendMessageBodySchema>;
