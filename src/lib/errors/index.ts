/**
 * Custom Error Classes
 *
 * Application-specific error types for better error handling and reporting.
 * These errors are used throughout the application to provide clear,
 * semantic error information that can be handled appropriately at different layers.
 *
 * Each error type includes:
 * - A descriptive message
 * - Optional details object for additional context
 * - A distinct name for error type checking
 */

/**
 * NotFoundError
 *
 * Thrown when a requested resource does not exist in the database.
 * Maps to HTTP 404 status code.
 *
 * Common use cases:
 * - Session not found by ID
 * - Scenario not found by ID
 * - User profile not found
 *
 * Example:
 * ```typescript
 * throw new NotFoundError('Session not found. Perhaps it wandered off?', {
 *   session_id: sessionId
 * });
 * ```
 */
export class NotFoundError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "NotFoundError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}

/**
 * ValidationError
 *
 * Thrown when input validation fails (e.g., Zod schema validation).
 * Maps to HTTP 400 status code.
 *
 * Common use cases:
 * - Invalid request body format
 * - Invalid query parameters
 * - Invalid path parameters
 * - Business rule violations
 *
 * Example:
 * ```typescript
 * throw new ValidationError('Invalid request parameters provided.', {
 *   chat_type: "chat_type must be 'main' or 'helper'",
 *   content: 'content cannot exceed 8000 characters'
 * });
 * ```
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ValidationError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * DatabaseError
 *
 * Thrown when a database operation fails.
 * Maps to HTTP 500 status code.
 *
 * Common use cases:
 * - Database connection failures
 * - Query execution errors
 * - Constraint violations
 * - Transaction rollback failures
 *
 * Example:
 * ```typescript
 * throw new DatabaseError('Failed to retrieve messages.', {
 *   session_id: sessionId,
 *   error: error.message
 * });
 * ```
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DatabaseError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }
}

/**
 * ConflictError
 *
 * Thrown when an operation conflicts with the current state of a resource.
 * Maps to HTTP 409 status code.
 *
 * Common use cases:
 * - Attempting to send messages to a completed session
 * - Attempting to create a second active session (violates single active session rule)
 * - Duplicate resource creation
 *
 * Example:
 * ```typescript
 * throw new ConflictError('Cannot send messages to completed session.', {
 *   session_id: sessionId,
 *   completed_at: session.completed_at
 * });
 * ```
 */
export class ConflictError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ConflictError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConflictError);
    }
  }
}

/**
 * ApiError
 *
 * Thrown when an external API call fails (e.g., Claude API, OpenRouter).
 * Maps to HTTP 500 or 504 status code depending on context.
 *
 * Common use cases:
 * - Claude API timeout
 * - Claude API rate limiting
 * - Claude API authentication failure
 * - Network errors during API calls
 *
 * Example:
 * ```typescript
 * throw new ApiError('The AI service took too long to respond.', {
 *   timeout_seconds: 30,
 *   chat_type: 'main',
 *   retry_count: 3
 * });
 * ```
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Type guard to check if an error is one of our custom error types
 */
export function isCustomError(
  error: unknown
): error is NotFoundError | ValidationError | DatabaseError | ConflictError | ApiError {
  return (
    error instanceof NotFoundError ||
    error instanceof ValidationError ||
    error instanceof DatabaseError ||
    error instanceof ConflictError ||
    error instanceof ApiError
  );
}
