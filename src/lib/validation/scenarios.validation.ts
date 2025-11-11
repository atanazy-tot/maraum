/**
 * Scenarios Validation Schemas
 *
 * Zod schemas for validating scenario-related inputs in API endpoints.
 * These schemas ensure that user inputs meet the required format and
 * constraints before processing.
 */

import { z } from "zod";

/**
 * Schema for validating scenario ID path parameters.
 *
 * This schema:
 * - Coerces string inputs to numbers (handles path params which are always strings)
 * - Ensures the value is an integer
 * - Ensures the value is positive (greater than 0)
 *
 * Valid examples: "1", "42", 1, 42
 * Invalid examples: "0", "-1", "abc", "1.5", null, undefined
 */
export const scenarioIdSchema = z.coerce
  .number({
    invalid_type_error: "Scenario ID must be a number",
  })
  .int({
    message: "Scenario ID must be an integer",
  })
  .positive({
    message: "Scenario ID must be a positive integer",
  });
