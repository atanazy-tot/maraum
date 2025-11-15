import { SessionProvider, useSession } from "./SessionContext";
import { CompletionBanner } from "./CompletionBanner";
import { ChatPanel } from "./ChatPanel";
import type { DualChatInterfaceProps } from "@/types/session-view.types";

/**
 * DualChatInterfaceContent
 *
 * Inner component that consumes SessionContext and renders the dual-chat layout.
 * Separated from DualChatInterface to ensure it's within the SessionProvider.
 */
function DualChatInterfaceContent() {
  const {
    session,
    mainMessages,
    helperMessages,
    isMainLoading,
    isHelperLoading,
    sendMainMessage,
    sendHelperMessage,
  } = useSession();

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Session data unavailable</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Completion Banner */}
      <CompletionBanner isVisible={session.is_completed} />

      {/* Dual Chat Grid - 50/50 Split */}
      <div className="grid grid-cols-2 flex-1 gap-0 overflow-hidden">
        {/* Main Chat - Left Panel (魔) */}
        <ChatPanel
          chatType="main"
          scenarioTitle={session.scenario.title}
          messages={mainMessages}
          onSendMessage={sendMainMessage}
          isLoading={isMainLoading}
          isCompleted={session.is_completed}
        />

        {/* Helper Chat - Right Panel (間) */}
        <ChatPanel
          chatType="helper"
          messages={helperMessages}
          onSendMessage={sendHelperMessage}
          isLoading={isHelperLoading}
          isCompleted={session.is_completed}
        />
      </div>
    </div>
  );
}

/**
 * DualChatInterface
 *
 * Main React container that wraps the SessionProvider and renders the dual-chat layout.
 * Provides the CSS Grid structure for 50/50 split and manages completion banner visibility.
 *
 * Architecture:
 * - SessionProvider: Manages all state and API communication
 * - CompletionBanner: Shown when session is completed
 * - Grid Layout: 50/50 split for main and helper chats
 * - ChatPanel (x2): One for main chat, one for helper chat
 *
 * Props:
 * - initialSession: Server-fetched session data
 * - initialMainMessages: Server-fetched main chat messages
 * - initialHelperMessages: Server-fetched helper chat messages
 */
export function DualChatInterface({
  initialSession,
  initialMainMessages,
  initialHelperMessages,
}: DualChatInterfaceProps) {
  return (
    <SessionProvider
      initialSession={initialSession}
      initialMainMessages={initialMainMessages}
      initialHelperMessages={initialHelperMessages}
    >
      <DualChatInterfaceContent />
    </SessionProvider>
  );
}
