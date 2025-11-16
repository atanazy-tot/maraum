import { useState, useEffect } from "react";

/**
 * useTypingAnimation
 *
 * Custom hook that creates a character-by-character typing animation effect.
 * Uses requestAnimationFrame for smooth 60fps animation.
 *
 * @param text - The full text to display
 * @param speed - Milliseconds per character (default: 20ms = ~50 chars/second)
 * @returns The text revealed so far
 *
 * @example
 * const displayText = useTypingAnimation(message.content, 20);
 */
export function useTypingAnimation(text: string, speed: number = 20): string {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      return;
    }

    let index = 0;
    let animationFrame: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastTime;

      if (elapsed >= speed) {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
          lastTime = currentTime;
        }
      }

      if (index < text.length) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [text, speed]);

  return displayedText;
}
