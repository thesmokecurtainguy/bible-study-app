"use client";

import { cn } from "@/lib/utils";

interface PassageDisplayProps {
  passage: string;
  className?: string;
}

/**
 * Displays Bible passage text with proper formatting
 * Handles verse numbers and paragraph breaks
 */
export function PassageDisplay({ passage, className }: PassageDisplayProps) {
  if (!passage) {
    return null;
  }

  // Split by paragraphs (double newlines or <p> tags)
  const paragraphs = passage
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className={cn("space-y-4", className)}>
      {paragraphs.map((paragraph, index) => {
        // Check if paragraph contains verse numbers (e.g., "1 ", "2 ", etc.)
        const hasVerseNumbers = /^\d+\s/.test(paragraph.trim());

        return (
          <p
            key={index}
            className={cn(
              "text-gray-900 leading-relaxed",
              hasVerseNumbers && "font-serif text-base sm:text-lg",
              !hasVerseNumbers && "text-sm text-gray-700"
            )}
          >
            {paragraph.split(/(\d+\s)/).map((part, partIndex) => {
              // Style verse numbers subtly
              if (/^\d+\s$/.test(part)) {
                return (
                  <span
                    key={partIndex}
                    className="text-gray-500 font-normal text-xs sm:text-sm mr-1"
                  >
                    {part}
                  </span>
                );
              }
              return <span key={partIndex}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

