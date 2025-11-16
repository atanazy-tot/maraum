import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { LoadingSpinner } from "./LoadingSpinner";
import type { ChatPanelProps } from "@/types/session-view.types";

/**
 * ChatPanel
 *
 * Reusable panel component for both main and helper chats.
 * Renders header with appropriate icon/title, scrollable message list,
 * input area, and loading indicator.
 *
 * Layout:
 * - Header: Fixed at top with icon and title
 * - Message List: Scrollable flex-1 area
 * - Loading Spinner: Conditional, shown during API call
 * - Message Input: Fixed at bottom
 *
 * Props:
 * - chatType: Determines icon (魔 or 間) and styling
 * - scenarioTitle: Only provided for main chat
 * - messages: Array of messages to display
 * - onSendMessage: Callback for sending new message
 * - isLoading: Shows spinner, disables input
 * - isCompleted: Disables input when scenario concluded
 */
export function ChatPanel({
  chatType,
  scenarioTitle,
  messages,
  onSendMessage,
  isLoading,
  isCompleted,
}: ChatPanelProps) {
  const icon = chatType === "main" ? "魔" : "間";
  const title = chatType === "main" ? scenarioTitle : "Helper";
  const placeholder =
    chatType === "main" ? "Type in German..." : "Ask for help...";

  return (
    <div
      className={`flex flex-col h-full border-r border-gray-200 ${
        chatType === "main" ? "bg-gray-50" : "bg-slate-50"
      }`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium">
          <span className="text-2xl mr-2">{icon}</span>
          {title}
        </h2>
      </div>

      {/* Message List - Scrollable Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} chatType={chatType} />
      </div>

      {/* Loading Indicator */}
      {isLoading && <LoadingSpinner />}

      {/* Message Input - Fixed at Bottom */}
      <div className="border-t border-gray-200 p-4">
        <MessageInput
          onSend={onSendMessage}
          isLoading={isLoading}
          isDisabled={isCompleted}
          placeholder={placeholder}
          chatType={chatType}
        />
      </div>
    </div>
  );
}
