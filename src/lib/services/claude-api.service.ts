/**
 * Claude API Service
 *
 * Handles all interactions with the Anthropic Claude API using the official
 * TypeScript SDK for generating AI responses in both main (German) and helper (English) chats.
 *
 * Features:
 * - Official Anthropic SDK for better type safety and future features
 * - Non-streaming responses (client handles streaming effect)
 * - Automatic retry with exponential backoff (3 attempts)
 * - Configurable timeouts per chat type
 * - Completion flag detection for scenario endings
 * - Comprehensive error handling
 * - Ready for advanced features (prompt caching, MCPs)
 *
 * SDK Documentation: https://github.com/anthropics/anthropic-sdk-typescript
 */

import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "@/lib/errors";
import type { ChatType } from "@/types";

// =============================================================================
// Configuration
// =============================================================================

/**
 * Claude API configuration constants
 */
const CLAUDE_CONFIG = {
  model: "claude-3-5-haiku-20241022", // Fast, cost-effective model

  // Main chat configuration (German scenario)
  main: {
    temperature: 0.9, // Higher creativity for natural conversation
    maxTokens: 2000,
    timeout: 30000, // 30 seconds
  },

  // Helper chat configuration (English assistant)
  helper: {
    temperature: 0.7, // More focused responses
    maxTokens: 1000,
    timeout: 20000, // 20 seconds
  },

  // Retry configuration
  retry: {
    attempts: 3,
    delays: [1000, 2000, 4000], // 1s, 2s, 4s exponential backoff
  },

  // Completion flag for scenario ending
  completionFlag: "[SCENARIO_COMPLETE]",
} as const;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Message format for Claude API (using SDK types)
 */
export type ClaudeMessage = Anthropic.MessageParam;

/**
 * Result returned by callClaudeAPI function
 */
export interface ClaudeAPIResult {
  content: string;
  contentWithoutFlag: string;
  completionFlagDetected: boolean;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  durationMs: number;
}

// =============================================================================
// Client Initialization
// =============================================================================

/**
 * Initialize Anthropic client with API key
 * Lazily initialized to avoid errors if key is missing at import time
 */
let anthropicClient: Anthropic | null = null;

const getAnthropicClient = (): Anthropic => {
  if (!anthropicClient) {
    const apiKey = import.meta.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new ApiError(
        "Claude API key not configured. Please set ANTHROPIC_API_KEY environment variable.",
        {
          missing_env_var: "ANTHROPIC_API_KEY",
        }
      );
    }

    anthropicClient = new Anthropic({
      apiKey,
      // Default timeout will be overridden per request
      maxRetries: 0, // We handle retries manually for better control
    });
  }

  return anthropicClient;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gets configuration for specific chat type
 */
const getConfigForChatType = (chatType: ChatType) => {
  return chatType === "main" ? CLAUDE_CONFIG.main : CLAUDE_CONFIG.helper;
};

/**
 * Detects if completion flag is present in content
 */
const detectCompletionFlag = (content: string): boolean => {
  return content.includes(CLAUDE_CONFIG.completionFlag);
};

/**
 * Removes completion flag from content for display
 */
const removeCompletionFlag = (content: string): string => {
  return content.replace(CLAUDE_CONFIG.completionFlag, "").trim();
};

/**
 * Extracts text content from Claude API response
 */
const extractContent = (response: Anthropic.Message): string => {
  const textContent = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textContent) {
    throw new ApiError("No text content in Claude API response", {
      response_id: response.id,
    });
  }

  return textContent.text;
};

/**
 * Wraps SDK call with timeout using AbortController
 */
const callWithTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await promise;
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    // Check if error is due to abort (timeout)
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Claude API request timed out", {
        timeout_ms: timeoutMs,
      });
    }

    throw error;
  }
};

/**
 * Converts SDK errors to our ApiError format
 */
const handleSDKError = (error: unknown, context: { chatType: ChatType }): never => {
  if (error instanceof Anthropic.APIError) {
    // Rate limiting
    if (error.status === 429) {
      throw new ApiError("Claude API rate limit exceeded", {
        status: error.status,
        type: error.type,
        chat_type: context.chatType,
      });
    }

    // Client errors (don't retry)
    if (error.status && error.status >= 400 && error.status < 500) {
      throw new ApiError(`Claude API client error: ${error.message}`, {
        status: error.status,
        type: error.type,
        chat_type: context.chatType,
      });
    }

    // Server errors (retry)
    if (error.status && error.status >= 500) {
      throw new ApiError(`Claude API server error: ${error.message}`, {
        status: error.status,
        type: error.type,
        chat_type: context.chatType,
      });
    }

    // Other API errors
    throw new ApiError(`Claude API error: ${error.message}`, {
      status: error.status,
      type: error.type,
      chat_type: context.chatType,
    });
  }

  // Network or other errors
  if (error instanceof Error) {
    // Timeout errors
    if (error.name === "AbortError") {
      throw new ApiError("Claude API request timed out", {
        chat_type: context.chatType,
      });
    }

    throw new ApiError(`Failed to call Claude API: ${error.message}`, {
      error_name: error.name,
      chat_type: context.chatType,
    });
  }

  // Unknown error type
  throw new ApiError("Unknown error calling Claude API", {
    error: String(error),
    chat_type: context.chatType,
  });
};

// =============================================================================
// Main API Function
// =============================================================================

/**
 * Calls Claude API to generate an AI response using the official SDK
 *
 * This function:
 * 1. Initializes Anthropic client with API key
 * 2. Builds request with appropriate config for chat type
 * 3. Makes API request with timeout
 * 4. Retries on failure with exponential backoff (3 attempts total)
 * 5. Detects and removes completion flag from response
 * 6. Returns structured result with content and metadata
 *
 * @param messages - Conversation history in Claude format (MessageParam[])
 * @param chatType - Which chat panel ('main' for German, 'helper' for English)
 * @returns Promise resolving to API result with content and metadata
 * @throws ApiError if all retry attempts fail or unrecoverable error occurs
 *
 * @example
 * ```typescript
 * const result = await callClaudeAPI([
 *   { role: 'user', content: 'Guten Tag!' },
 *   { role: 'assistant', content: 'Hallo! Wie kann ich dir helfen?' },
 *   { role: 'user', content: 'Ich möchte Äpfel kaufen.' }
 * ], 'main');
 *
 * console.log(result.contentWithoutFlag); // Display to user
 * console.log(result.completionFlagDetected); // Check if scenario complete
 * console.log(result.usage.output_tokens); // For logging/metrics
 * ```
 */
export async function callClaudeAPI(
  messages: ClaudeMessage[],
  chatType: ChatType
): Promise<ClaudeAPIResult> {
  // Get Anthropic client
  const client = getAnthropicClient();

  // Get config for chat type
  const config = getConfigForChatType(chatType);

  // Track timing
  const startTime = Date.now();

  // Retry loop
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < CLAUDE_CONFIG.retry.attempts; attempt++) {
    try {
      // Make API request with timeout
      const response = await callWithTimeout(
        client.messages.create({
          model: CLAUDE_CONFIG.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          messages,
        }),
        config.timeout
      );

      // Extract content
      const content = extractContent(response);

      // Detect and remove completion flag
      const completionFlagDetected = detectCompletionFlag(content);
      const contentWithoutFlag = removeCompletionFlag(content);

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Return successful result
      return {
        content,
        contentWithoutFlag,
        completionFlagDetected,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
        durationMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Convert to ApiError if needed
      try {
        handleSDKError(error, { chatType });
      } catch (apiError) {
        lastError = apiError instanceof Error ? apiError : new Error(String(apiError));

        // Don't retry if it's a client error (4xx except 429)
        if (apiError instanceof ApiError && apiError.details?.status) {
          const status = apiError.details.status as number;
          if (status >= 400 && status < 500 && status !== 429) {
            throw apiError; // Don't retry client errors (except rate limiting)
          }
        }
      }

      // If this was the last attempt, throw the error
      if (attempt === CLAUDE_CONFIG.retry.attempts - 1) {
        throw new ApiError(
          "Claude API failed after multiple attempts. Your message was saved; please try again.",
          {
            retry_count: CLAUDE_CONFIG.retry.attempts,
            last_error: lastError.message,
            chat_type: chatType,
          }
        );
      }

      // Wait before retrying
      await sleep(CLAUDE_CONFIG.retry.delays[attempt]);
    }
  }

  // This should never be reached due to the throw in the loop
  throw new ApiError("Unexpected error in retry loop", {
    last_error: lastError?.message,
  });
}

/**
 * Formats message history for Claude API
 * Converts from database format to SDK's MessageParam format
 *
 * @param history - Array of messages from database with role and content
 * @returns Array of MessageParam objects for SDK
 */
export function formatMessagesForClaude(
  history: Array<{ role: string; content: string }>
): ClaudeMessage[] {
  return history.map((msg) => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.content,
  })) as ClaudeMessage[];
}

/**
 * Type guard to check if a value is a valid MessageParam
 */
export function isValidClaudeMessage(
  value: unknown
): value is Anthropic.MessageParam {
  if (typeof value !== "object" || value === null) return false;
  const msg = value as Record<string, unknown>;
  return (
    (msg.role === "user" || msg.role === "assistant") &&
    typeof msg.content === "string"
  );
}
