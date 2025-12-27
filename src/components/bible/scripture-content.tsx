"use client";

import { useMemo } from "react";
import { parseScriptureReferences } from "@/lib/bible/parse-references";
import { ScriptureLink } from "./scripture-link";

interface ScriptureContentProps {
  htmlContent: string;
  className?: string;
}

type ContentPart =
  | { type: "html"; content: string }
  | { type: "scripture"; ref: string; text: string };

/**
 * Type guard to check if a ContentPart is a scripture reference
 */
function isScripturePart(part: ContentPart): part is { type: "scripture"; ref: string; text: string } {
  return part.type === "scripture";
}

/**
 * Component that parses HTML content and makes scripture references clickable
 */
export function ScriptureContent({
  htmlContent,
  className,
}: ScriptureContentProps) {
  const parsedContent = useMemo(() => {
    if (!htmlContent) return [];

    // First, parse and wrap scripture references
    const withMarkers = parseScriptureReferences(htmlContent);

    // Parse the HTML and extract scripture-ref tags
    const parts: ContentPart[] = [];
    const regex = /<scripture-ref\s+data-ref="([^"]+)">([^<]+)<\/scripture-ref>/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(withMarkers)) !== null) {
      // Add HTML before the match
      if (match.index > lastIndex) {
        const htmlBefore = withMarkers.substring(lastIndex, match.index);
        if (htmlBefore) {
          parts.push({ type: "html", content: htmlBefore });
        }
      }
      // Add scripture reference
      parts.push({
        type: "scripture",
        ref: match[1],
        text: match[2],
      });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining HTML
    if (lastIndex < withMarkers.length) {
      const remainingHtml = withMarkers.substring(lastIndex);
      if (remainingHtml) {
        parts.push({ type: "html", content: remainingHtml });
      }
    }

    // If no scripture references found, return original HTML as single part
    if (parts.length === 0) {
      return [{ type: "html", content: htmlContent }];
    }

    return parts;
  }, [htmlContent]);

  if (parsedContent.length === 0) {
    return null;
  }

  // Render parts, converting scripture-ref to ScriptureLink components
  return (
    <div className={className}>
      {parsedContent.map((part, index) => {
        if (part.type === "html") {
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: part.content }}
            />
          );
        }
        if (isScripturePart(part)) {
          return (
            <ScriptureLink key={index} reference={part.ref}>
              {part.text}
            </ScriptureLink>
          );
        }
        return null;
      })}
    </div>
  );
}

