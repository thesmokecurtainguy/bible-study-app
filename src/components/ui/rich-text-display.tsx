"use client";

import { cn } from "@/lib/utils";
import { ScriptureContent } from "@/components/bible/scripture-content";

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  if (!content || content === "<p></p>") {
    return null;
  }

  return (
    <ScriptureContent
      htmlContent={content}
      className={cn(
        "prose prose-sm max-w-none",
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0",
        "prose-p:text-gray-700 prose-li:text-gray-700",
        className
      )}
    />
  );
}

export default RichTextDisplay;

