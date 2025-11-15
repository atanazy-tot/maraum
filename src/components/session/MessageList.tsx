import { useAutoScroll } from "@/components/hooks/useAutoScroll";
import { Message } from "./Message";
import type { MessageListProps } from "@/types/session-view.types";

/**
 * MessageList
 *
 * Scrollable container that renders all messages for a chat panel.
 * Implements auto-scroll behavior that follows new messages but
 * respects manual user scrolling.
 *
 * Features:
 * - Auto-scroll to new messages when at bottom
 * - Disable auto-scroll when user scrolls up
 * - Re-enable auto-scroll when user returns to bottom
 * - Scroll anchor for smooth scrolling
 */
export function MessageList({ messages, chatType }: MessageListProps) {
  const { scrollAnchorRef, containerRef, handleScroll } = useAutoScroll(messages);

  return (
    <div
      className="flex flex-col gap-4 p-6 overflow-y-auto"
      onScroll={handleScroll}
      ref={containerRef}
    >
      {messages.map((message) => (
        <Message key={message.id} message={message} chatType={chatType} />
      ))}
      <div ref={scrollAnchorRef} />
    </div>
  );
}
