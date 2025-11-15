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
 * - Strictly validates boolean string representations ("true", "false", "1", "0")
 * - Rejects invalid values like "maybe", "yes", "banana"
 * - Uses default value of true when not provided
 * - Transforms valid strings to actual boolean values
 *
 * Valid examples:
 * - {} (empty object uses default true)
 * - { include_messages: "true" } → true
 * - { include_messages: "false" } → false
 * - { include_messages: "1" } → true
 * - { include_messages: "0" } → false
 *
 * Invalid examples (will throw ZodError):
 * - { include_messages: "maybe" } - not a valid boolean representation
 * - { include_messages: "yes" } - not a valid boolean representation
 * - { include_messages: "banana" } - not a valid boolean representation
 */
export const getSessionQuerySchema = z.object({
  include_messages: z
    .enum(["true", "false", "1", "0"], {
      errorMap: () => ({
        message: "Must be a boolean value (true, false, 1, or 0)",
      }),
    })
    .optional()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
});

/**
 * Inferred TypeScript type for GET session query parameters
 */
export type GetSessionQuery = z.infer<typeof getSessionQuerySchema>;
