import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import type { MessageInputProps } from "@/types/session-view.types";

/**
 * MessageInput
 *
 * Text input component with send button, character counter, and keyboard shortcuts.
 * Handles input validation and disabled states.
 *
 * Features:
 * - Character limit: 8000 characters
 * - Character counter (shown when > 7500 chars)
 * - Enter to send, Shift+Enter for new line
 * - Validation: non-empty, within limit, not loading, not disabled
 * - Auto-clear on successful send
 */
export function MessageInput({
  onSend,
  isLoading,
  isDisabled,
  placeholder,
}: MessageInputProps) {
  const [inputValue, setInputValue] = useState("");

  const charCount = inputValue.length;
  const isNearLimit = charCount > 7500;
  const isOverLimit = charCount > 8000;
  const canSend =
    inputValue.trim().length > 0 &&
    charCount <= 8000 &&
    !isLoading &&
    !isDisabled;

  const handleSend = async () => {
    if (!canSend) return;

    await onSend(inputValue);
    setInputValue(""); // Clear input after sending
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Allow Shift+Enter for new line (default behavior)
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Character Counter (only shown when approaching limit) */}
      {isNearLimit && (
        <div
          className={`text-xs text-right ${
            isOverLimit ? "text-red-500" : "text-gray-500"
          }`}
        >
          {charCount} / 8000 characters
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled || isLoading}
          className="flex-1 resize-none"
          rows={3}
        />

        <Button
          onClick={handleSend}
          disabled={!canSend}
          variant="default"
          size="icon"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
