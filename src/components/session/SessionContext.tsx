import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import type {
  SessionContextValue,
  SessionProviderProps,
  SendMessageRequest,
} from "@/types/session-view.types";
import type { MessageDTO, MessageResponseDTO } from "@/types";

/**
 * SessionContext
 *
 * React context for managing session state, messages, and API interactions.
 * Provides session data, message arrays, loading states, and send actions
 * to all components within the dual-chat interface.
 */
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * SessionProvider
 *
 * Context provider component that manages all session-related state and logic.
 * Handles optimistic UI updates, API communication, error recovery, and
 * session completion detection.
 *
 * State Management:
 * - session: Current session metadata
 * - mainMessages/helperMessages: Separate arrays for independent chat updates
 * - isMainLoading/isHelperLoading: Independent loading states
 * - error: Current error message if any operation failed
 *
 * API Integration:
 * - sendMainMessage: Sends user message to main chat, receives AI response
 * - sendHelperMessage: Sends user message to helper chat, receives AI response
 * - Implements optimistic updates with rollback on error
 * - Handles session completion detection
 */
export const SessionProvider: React.FC<SessionProviderProps> = ({
  children,
  initialSession,
  initialMainMessages,
  initialHelperMessages,
}) => {
  const animatedMessageIdsRef = useRef<Set<string>>(
    new Set([
      ...initialMainMessages.map((message) => message.id),
      ...initialHelperMessages.map((message) => message.id),
    ])
  );

  const [session, setSession] = useState(initialSession);
  const [mainMessages, setMainMessages] = useState<MessageDTO[]>(initialMainMessages);
  const [helperMessages, setHelperMessages] = useState<MessageDTO[]>(initialHelperMessages);
  const [isMainLoading, setIsMainLoading] = useState(false);
  const [isHelperLoading, setIsHelperLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnimatedMessage = useCallback((messageId: string) => {
    return animatedMessageIdsRef.current.has(messageId);
  }, []);

  const markMessageAnimated = useCallback((messageId: string) => {
    animatedMessageIdsRef.current.add(messageId);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  /**
   * sendMainMessage
   *
   * Sends a user message to the main chat (German scenario chat).
   * Implements optimistic UI updates and handles session completion.
   *
   * Flow:
   * 1. Validate session is not completed
   * 2. Add optimistic user message
   * 3. Call API
   * 4. Replace optimistic with real messages
   * 5. Handle session completion if flagged
   * 6. Rollback on error
   */
  const sendMainMessage = async (content: string) => {
    if (!session || session.is_completed) {
      setError("This scenario has concluded. You cannot send more messages.");
      return;
    }

    setIsMainLoading(true);
    setError(null);

    // Optimistic update
    const optimisticMessage: MessageDTO = {
      id: `temp-${Date.now()}`,
      role: "user",
      chat_type: "main",
      content,
      sent_at: new Date().toISOString(),
    };
    setMainMessages((prev) => [...prev, optimisticMessage]);

    try {
      const requestBody: SendMessageRequest = {
        chat_type: "main",
        content,
        client_message_id: crypto.randomUUID(),
      };

      const response = await fetch(`/api/sessions/${session.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 409) {
          setError("This scenario has concluded. You cannot send more messages.");
          setSession((prev) => ({ ...prev, is_completed: true }));
        } else if (response.status === 400) {
          const errorData = await response.json();
          setError(errorData.message || "Invalid message. Please check your input.");
        } else if (response.status === 504) {
          setError("Connection lost. How disappointing. Your progress is safe, try again.");
        } else if (response.status >= 500) {
          setError("The system has failed you. Please try again.");
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to send message");
        }

        // Remove optimistic message on error
        setMainMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        return;
      }

      const data: MessageResponseDTO = await response.json();

      // Replace optimistic message with real ones
      setMainMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticMessage.id),
        data.user_message,
        data.assistant_message,
      ]);

      // Handle session completion
      if (data.session_complete && data.session) {
        setSession((prev) => ({
          ...prev,
          is_completed: true,
          completed_at: data.session.completed_at,
          duration_seconds: data.session.duration_seconds,
          message_count_main: data.session.message_count_main,
          message_count_helper: data.session.message_count_helper,
        }));
      }
    } catch (err) {
      // Remove optimistic message on error
      setMainMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));

      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("No connection. Check your internet.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Try again."
        );
      }
    } finally {
      setIsMainLoading(false);
    }
  };

  /**
   * sendHelperMessage
   *
   * Sends a user message to the helper chat (English AI companion).
   * Similar to sendMainMessage but for helper chat.
   *
   * Note: Helper chat messages do not trigger session completion.
   */
  const sendHelperMessage = async (content: string) => {
    if (!session || session.is_completed) {
      setError("This scenario has concluded. You cannot send more messages.");
      return;
    }

    setIsHelperLoading(true);
    setError(null);

    // Optimistic update
    const optimisticMessage: MessageDTO = {
      id: `temp-${Date.now()}`,
      role: "user",
      chat_type: "helper",
      content,
      sent_at: new Date().toISOString(),
    };
    setHelperMessages((prev) => [...prev, optimisticMessage]);

    try {
      const requestBody: SendMessageRequest = {
        chat_type: "helper",
        content,
        client_message_id: crypto.randomUUID(),
      };

      const response = await fetch(`/api/sessions/${session.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 409) {
          setError("This scenario has concluded. You cannot send more messages.");
          setSession((prev) => ({ ...prev, is_completed: true }));
        } else if (response.status === 400) {
          const errorData = await response.json();
          setError(errorData.message || "Invalid message. Please check your input.");
        } else if (response.status === 504) {
          setError("Connection lost. How disappointing. Your progress is safe, try again.");
        } else if (response.status >= 500) {
          setError("The system has failed you. Please try again.");
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to send message");
        }

        // Remove optimistic message on error
        setHelperMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        return;
      }

      const data: MessageResponseDTO = await response.json();

      // Replace optimistic message with real ones
      setHelperMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticMessage.id),
        data.user_message,
        data.assistant_message,
      ]);

      // Note: Helper chat doesn't complete sessions, but we still check
      // in case the backend logic changes
      if (data.session_complete && data.session) {
        setSession((prev) => ({
          ...prev,
          is_completed: true,
          completed_at: data.session.completed_at,
          duration_seconds: data.session.duration_seconds,
          message_count_main: data.session.message_count_main,
          message_count_helper: data.session.message_count_helper,
        }));
      }
    } catch (err) {
      // Remove optimistic message on error
      setHelperMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));

      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("No connection. Check your internet.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Try again."
        );
      }
    } finally {
      setIsHelperLoading(false);
    }
  };

  const value: SessionContextValue = {
    session,
    mainMessages,
    helperMessages,
    isMainLoading,
    isHelperLoading,
    sendMainMessage,
    sendHelperMessage,
    error,
    clearError,
    hasAnimatedMessage,
    markMessageAnimated,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

/**
 * useSession
 *
 * Custom hook to access the SessionContext.
 * Must be used within a SessionProvider.
 *
 * @throws Error if used outside of SessionProvider
 * @returns SessionContextValue with all session state and actions
 *
 * @example
 * const { session, mainMessages, sendMainMessage, isMainLoading } = useSession();
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
