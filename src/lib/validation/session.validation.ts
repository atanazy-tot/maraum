/**
 * Session Validation Schemas
 *
 * Zod schemas for validating session-related inputs in API endpoints.
 * These schemas ensure that user inputs meet the required format and
 * constraints before processing.
 */

import { z } from "zod";

/**
 * Schema for validating session ID path parameters.
 *
 * This schema:
 * - Validates UUID v4 format (RFC 4122 compliant)
 * - Provides clear error messages for invalid formats
 *
 * Valid examples: "550e8400-e29b-41d4-a716-446655440000"
 * Invalid examples: "not-a-uuid", "12345", "", null, undefined
 */
export const sessionIdSchema = z.string().uuid({
  message: "Invalid session ID format",
});

/**
 * Schema for validating query parameters when retrieving a session.
 *
 * Query parameters:
 * - include_messages: Whether to include message history (default: true)
 *
 * This schema:
 * - Coerces string inputs to booleans ("true", "false", "1", "0")
 * - Uses default value of true when not provided
 *
 * Valid examples:
 * - {} (empty object uses default true)
 * - { include_messages: "true" }
 * - { include_messages: "false" }
 * - { include_messages: true }
 * - { include_messages: 1 }
 * - { include_messages: 0 }
 *
 * Invalid examples:
 * - { include_messages: "maybe" } - cannot be coerced to boolean
 * - { include_messages: "yes" } - cannot be coerced to boolean
 */
export const getSessionQuerySchema = z.object({
  include_messages: z.coerce.boolean().default(true),
});

/**
 * Inferred TypeScript type for GET session query parameters
 */
export type GetSessionQuery = z.infer<typeof getSessionQuerySchema>;
