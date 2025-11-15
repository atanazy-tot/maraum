import { useTypingAnimation } from "@/components/hooks/useTypingAnimation";
import type { MessageProps } from "@/types/session-view.types";

/**
 * Message
 *
 * Individual message display component with conditional styling based on role
 * (user vs assistant) and typing animation for assistant messages.
 *
 * Features:
 * - User messages: Right-aligned, blue background
 * - Assistant messages: Left-aligned, background varies by chat type
 * - Typing animation for assistant messages only
 * - Timestamp display
 * - Proper text wrapping
 */
export function Message({ message, chatType }: MessageProps) {
  const isUser = message.role === "user";

  // Apply typing animation only for assistant messages
  const displayText = isUser
    ? message.content
    : useTypingAnimation(message.content, 20);

  // Format timestamp to local time
  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isUser
            ? "bg-blue-500 text-white"
            : chatType === "main"
              ? "bg-white border border-gray-200"
              : "bg-slate-100"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{displayText}</p>
        <time className="text-xs opacity-70 mt-1 block">
          {formatTimestamp(message.sent_at)}
        </time>
      </div>
    </div>
  );
}
