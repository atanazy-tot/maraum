/**
 * Prompt Service
 *
 * Manages prompt templates for both main (German scenario) and helper (English assistant) chats.
 * Loads templates from markdown files and prepares them for Claude API requests.
 *
 * Template Storage:
 * - Main chat: prompts/scenarios/{scenario_name}.md
 * - Helper chat: prompts/helper-base.md
 *
 * Templates are plain markdown files containing system instructions, scenario context,
 * completion criteria, and example exchanges.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChatType } from "@/types";
import type { SupabaseClient } from "@/db/supabase.client";
import { DatabaseError } from "@/lib/errors";
import type { ClaudeMessage } from "@/lib/services/claude-api.service";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Message history item from database
 */
interface MessageHistoryItem {
  role: string;
  content: string;
  sent_at: string;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Prompt configuration constants
 */
const PROMPT_CONFIG = {
  // Directory paths (relative to project root)
  scenariosDir: "prompts/scenarios",
  helperPath: "prompts/helper-base.md",

  // Message history limits for context window management
  main: {
    maxMessages: 20, // Last 20 messages for main chat
  },
  helper: {
    maxMainMessages: 10, // Last 10 from main chat for context
    maxHelperMessages: 5, // Last 5 from helper chat
  },
} as const;

// =============================================================================
// File System Utilities
// =============================================================================

/**
 * Reads a prompt template file from disk
 */
async function readPromptFile(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, "utf-8");
    return content.trim();
  } catch (error) {
    throw new Error(
      `Failed to read prompt file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Constructs file path for scenario prompt
 */
function getScenarioFilePath(scenarioName: string): string {
  return join(process.cwd(), PROMPT_CONFIG.scenariosDir, `${scenarioName}.md`);
}

/**
 * Constructs file path for helper prompt
 */
function getHelperFilePath(): string {
  return join(process.cwd(), PROMPT_CONFIG.helperPath);
}

// =============================================================================
// Message History Utilities
// =============================================================================

/**
 * Converts database role to Claude API role
 */
function toClaudeRole(dbRole: string): "user" | "assistant" {
  return dbRole === "user" ? "user" : "assistant";
}

/**
 * Formats message history for Claude API
 */
function formatMessageHistory(messages: MessageHistoryItem[]): ClaudeMessage[] {
  return messages.map((msg) => ({
    role: toClaudeRole(msg.role),
    content: msg.content,
  }));
}

/**
 * Fetches message history for main chat
 */
async function fetchMainChatHistory(
  supabase: SupabaseClient,
  sessionId: string,
  limit: number
): Promise<MessageHistoryItem[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, sent_at")
    .eq("session_id", sessionId)
    .eq("chat_type", "main")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new DatabaseError("Failed to fetch main chat history", {
      session_id: sessionId,
      error: error.message,
    });
  }

  // Reverse to get chronological order (oldest to newest)
  return (data || []).reverse();
}

/**
 * Fetches message history for helper chat
 */
async function fetchHelperChatHistory(
  supabase: SupabaseClient,
  sessionId: string,
  limit: number
): Promise<MessageHistoryItem[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, sent_at")
    .eq("session_id", sessionId)
    .eq("chat_type", "helper")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new DatabaseError("Failed to fetch helper chat history", {
      session_id: sessionId,
      error: error.message,
    });
  }

  // Reverse to get chronological order (oldest to newest)
  return (data || []).reverse();
}

// =============================================================================
// Scenario Name Mapping
// =============================================================================

/**
 * Maps scenario ID to file name
 * This mapping should match the scenario titles in the database
 */
function getScenarioFileName(scenarioId: number): string {
  const scenarioMap: Record<number, string> = {
    1: "marketplace",
    2: "party",
    3: "kebab",
  };

  const fileName = scenarioMap[scenarioId];
  if (!fileName) {
    throw new Error(`Unknown scenario ID: ${scenarioId}`);
  }

  return fileName;
}

// =============================================================================
// Main Service Functions
// =============================================================================

/**
 * Builds prompt for main chat (German scenario)
 *
 * Constructs a complete prompt by:
 * 1. Loading scenario template from disk
 * 2. Fetching recent message history
 * 3. Combining system prompt with history
 * 4. Adding current user message
 *
 * @param supabase - Supabase client for fetching history
 * @param sessionId - Session ID for context
 * @param scenarioId - Scenario ID to determine which template to load
 * @param currentMessage - The user's latest message
 * @returns Promise resolving to formatted messages for Claude API
 *
 * @example
 * ```typescript
 * const messages = await getMainChatPrompt(
 *   supabase,
 *   sessionId,
 *   1, // marketplace scenario
 *   'Ich möchte drei Äpfel kaufen.'
 * );
 * // Returns: [{ role: 'user', content: '<system prompt>' }, { role: 'assistant', content: '...' }, ...]
 * ```
 */
export async function getMainChatPrompt(
  supabase: SupabaseClient,
  sessionId: string,
  scenarioId: number,
  currentMessage: string
): Promise<ClaudeMessage[]> {
  // Load scenario template
  const scenarioName = getScenarioFileName(scenarioId);
  const filePath = getScenarioFilePath(scenarioName);
  const systemPrompt = await readPromptFile(filePath);

  // Fetch message history
  const history = await fetchMainChatHistory(
    supabase,
    sessionId,
    PROMPT_CONFIG.main.maxMessages
  );

  // Format history for Claude
  const formattedHistory = formatMessageHistory(history);

  // Construct messages array
  // First message includes system prompt as user message
  // (Claude API doesn't have a separate system role)
  const messages: ClaudeMessage[] = [];

  // If no history, start with system prompt
  if (formattedHistory.length === 0) {
    messages.push({
      role: "user",
      content: systemPrompt,
    });
  } else {
    // Prepend system prompt to first user message
    messages.push({
      role: "user",
      content: `${systemPrompt}\n\n---\n\n${formattedHistory[0].content}`,
    });

    // Add rest of history
    messages.push(...formattedHistory.slice(1));
  }

  // Add current message
  messages.push({
    role: "user",
    content: currentMessage,
  });

  return messages;
}

/**
 * Builds prompt for helper chat (English assistant)
 *
 * Constructs a complete prompt by:
 * 1. Loading helper base template from disk
 * 2. Fetching recent main chat context (for awareness of scenario progress)
 * 3. Fetching recent helper chat history
 * 4. Combining all context
 * 5. Adding current user message
 *
 * @param supabase - Supabase client for fetching history
 * @param sessionId - Session ID for context
 * @param currentMessage - The user's latest message to helper
 * @returns Promise resolving to formatted messages for Claude API
 *
 * @example
 * ```typescript
 * const messages = await getHelperChatPrompt(
 *   supabase,
 *   sessionId,
 *   'How do I say "I would like" in German?'
 * );
 * ```
 */
export async function getHelperChatPrompt(
  supabase: SupabaseClient,
  sessionId: string,
  currentMessage: string
): Promise<ClaudeMessage[]> {
  // Load helper template
  const filePath = getHelperFilePath();
  const systemPrompt = await readPromptFile(filePath);

  // Fetch message histories
  const [mainHistory, helperHistory] = await Promise.all([
    fetchMainChatHistory(
      supabase,
      sessionId,
      PROMPT_CONFIG.helper.maxMainMessages
    ),
    fetchHelperChatHistory(
      supabase,
      sessionId,
      PROMPT_CONFIG.helper.maxHelperMessages
    ),
  ]);

  // Format histories
  const formattedHelperHistory = formatMessageHistory(helperHistory);

  // Construct messages array
  const messages: ClaudeMessage[] = [];

  // Build context-aware system prompt
  let contextualSystemPrompt = systemPrompt;

  // Add main chat context if available
  if (mainHistory.length > 0) {
    const mainContext = mainHistory
      .map((msg) => `[${msg.role}]: ${msg.content}`)
      .join("\n");

    contextualSystemPrompt += `\n\n--- Recent Main Chat Context ---\n${mainContext}\n---`;
  }

  // Start conversation with system prompt
  if (formattedHelperHistory.length === 0) {
    messages.push({
      role: "user",
      content: contextualSystemPrompt,
    });
  } else {
    // Prepend contextual system prompt to first user message
    messages.push({
      role: "user",
      content: `${contextualSystemPrompt}\n\n---\n\n${formattedHelperHistory[0].content}`,
    });

    // Add rest of history
    messages.push(...formattedHelperHistory.slice(1));
  }

  // Add current message
  messages.push({
    role: "user",
    content: currentMessage,
  });

  return messages;
}

/**
 * Gets prompt based on chat type
 * Convenience wrapper that dispatches to appropriate prompt builder
 */
export async function getPromptForChatType(
  supabase: SupabaseClient,
  sessionId: string,
  chatType: ChatType,
  scenarioId: number | null,
  currentMessage: string
): Promise<ClaudeMessage[]> {
  if (chatType === "main") {
    if (scenarioId === null) {
      throw new Error("Scenario ID is required for main chat");
    }
    return getMainChatPrompt(supabase, sessionId, scenarioId, currentMessage);
  } else {
    return getHelperChatPrompt(supabase, sessionId, currentMessage);
  }
}
