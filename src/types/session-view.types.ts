/**
 * Type definitions for Active Session View
 *
 * Contains ViewModels and component prop interfaces for the dual-chat session interface.
 * All types are derived from or extend the base DTOs from types.ts.
 */

import type { SessionDTO, MessageDTO, ChatType, MessageResponseDTO } from "@/types";

/**
 * SessionViewData
 *
 * Server-side prepared data structure for the session page.
 * Separates messages by chat type for easier client-side consumption.
 *
 * Used by: session.astro during server-side data preparation
 */
export interface SessionViewData {
  session: SessionDTO;
  mainMessages: MessageDTO[];
  helperMessages: MessageDTO[];
}

/**
 * SessionContextValue
 *
 * Shape of the context provided by SessionProvider to all child components.
 * Contains session state, message arrays, loading states, and action functions.
 *
 * Used by: useSession() hook consumers
 */
export interface SessionContextValue {
  session: SessionDTO | null;
  mainMessages: MessageDTO[];
  helperMessages: MessageDTO[];
  isMainLoading: boolean;
  isHelperLoading: boolean;
  sendMainMessage: (content: string) => Promise<void>;
  sendHelperMessage: (content: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
  hasAnimatedMessage: (messageId: string) => boolean;
  markMessageAnimated: (messageId: string) => void;
}

/**
 * SessionProviderProps
 *
 * Props for SessionProvider component.
 * Receives server-side fetched initial data.
 */
export interface SessionProviderProps {
  children: React.ReactNode;
  initialSession: SessionDTO;
  initialMainMessages: MessageDTO[];
  initialHelperMessages: MessageDTO[];
}

/**
 * DualChatInterfaceProps
 *
 * Props for the top-level React component that renders the dual-chat interface.
 * Same as SessionProviderProps minus children.
 */
export interface DualChatInterfaceProps {
  initialSession: SessionDTO;
  initialMainMessages: MessageDTO[];
  initialHelperMessages: MessageDTO[];
}

/**
 * ChatPanelProps
 *
 * Props for the reusable ChatPanel component (used for both main and helper chats).
 */
export interface ChatPanelProps {
  chatType: ChatType;
  scenarioTitle?: string; // Only provided for main chat
  messages: MessageDTO[];
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  isCompleted: boolean;
}

/**
 * MessageListProps
 *
 * Props for MessageList component that renders a scrollable list of messages.
 */
export interface MessageListProps {
  messages: MessageDTO[];
  chatType: ChatType;
}

/**
 * MessageProps
 *
 * Props for individual Message component.
 */
export interface MessageProps {
  message: MessageDTO;
  chatType: ChatType;
}

/**
 * MessageInputProps
 *
 * Props for MessageInput component with text input and send button.
 */
export interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  isLoading: boolean;
  isDisabled: boolean;
  placeholder: string;
  chatType: ChatType;
}

/**
 * CompletionBannerProps
 *
 * Props for the completion banner displayed when scenario is completed.
 */
export interface CompletionBannerProps {
  isVisible: boolean;
}

/**
 * SendMessageRequest
 *
 * Request body type for POST /api/sessions/:sessionId/messages
 * Matches SendMessageCommand from types.ts
 */
export interface SendMessageRequest {
  chat_type: ChatType;
  content: string;
  client_message_id?: string;
}
