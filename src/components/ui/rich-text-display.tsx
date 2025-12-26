import { cn } from "@/lib/utils";

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  if (!content || content === "<p></p>") {
    return null;
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0",
        "prose-p:text-gray-700 prose-li:text-gray-700",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default RichTextDisplay;

