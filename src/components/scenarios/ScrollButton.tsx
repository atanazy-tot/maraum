/**
 * ScrollButton
 *
 * Reusable carousel navigation button.
 * Displays chevron icon pointing left or right.
 * Can be disabled independently of tile state.
 *
 * Design Notes:
 * - Always rendered (even when disabled) for consistent layout
 * - Visual feedback for hover/focus states
 * - Accessible with keyboard navigation
 */

interface ScrollButtonProps {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}

export function ScrollButton({ direction, disabled, onClick, ariaLabel }: ScrollButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all
        ${
          disabled
            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300"
            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        }
      `}
    >
      {/* Chevron Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        {direction === "left" ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}
