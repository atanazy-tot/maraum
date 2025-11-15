import { useRef, useState, useEffect } from "react";
import type { MessageDTO } from "@/types";

/**
 * useAutoScroll
 *
 * Custom hook that manages automatic scrolling behavior for a message list.
 * Automatically scrolls to new messages when user is at the bottom,
 * but respects manual scrolling by disabling auto-scroll when user scrolls up.
 *
 * @param messages - Array of messages to track for changes
 * @returns Object containing refs and handlers for scroll management
 *
 * @example
 * const { scrollAnchorRef, containerRef, handleScroll } = useAutoScroll(messages);
 * <div ref={containerRef} onScroll={handleScroll}>
 *   {messages.map(...)}
 *   <div ref={scrollAnchorRef} />
 * </div>
 */
export function useAutoScroll(messages: MessageDTO[]) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // Scroll to bottom when new messages arrive and auto-scroll is enabled
  useEffect(() => {
    if (autoScrollEnabled && scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScrollEnabled]);

  // Detect manual scroll and toggle auto-scroll behavior
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom =
      Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;

    // Re-enable auto-scroll when user scrolls back to bottom
    setAutoScrollEnabled(isAtBottom);
  };

  return {
    scrollAnchorRef,
    containerRef,
    handleScroll,
  };
}
