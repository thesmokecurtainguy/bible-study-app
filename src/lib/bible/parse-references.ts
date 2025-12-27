/**
 * Parses scripture references from HTML content and wraps them in markers
 */

/**
 * Normalizes a scripture reference for consistent matching
 * Converts to lowercase and removes extra spaces
 */
function normalizeReference(ref: string): string {
  return ref.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Checks if a reference is already wrapped in a scripture-ref tag
 */
function isAlreadyWrapped(html: string, index: number): boolean {
  // Look backwards for opening tag
  const before = html.substring(Math.max(0, index - 50), index);
  return before.includes("<scripture-ref");
}

/**
 * Finds and wraps scripture references in HTML content
 * 
 * Patterns matched:
 * - "John 4:1-15"
 * - "1 Timothy 2:3-4"
 * - "Psalm 23:1-6"
 * - "Genesis 1:1"
 * - "Matt. 5:1-12"
 * - "1 Cor. 13:4-7"
 * - "Rev. 21:1-4"
 * 
 * @param htmlContent - HTML content to parse
 * @returns HTML with scripture references wrapped in <scripture-ref> tags
 */
export function parseScriptureReferences(htmlContent: string): string {
  if (!htmlContent || typeof htmlContent !== "string") {
    return htmlContent;
  }

  // Pattern to match scripture references
  // Matches: Book (optional number) (optional period) Chapter:Verse(-Verse)
  // Examples: John 4:1-15, 1 Timothy 2:3-4, Matt. 5:1-12, Psalm 23:1-6
  const scripturePattern = /\b(?:\d+\s+)?[A-Za-z]+\.?\s+\d+:\d+(?:-\d+)?(?::\d+(?:-\d+)?)?\b/g;

  const matches: Array<{ match: string; index: number }> = [];

  // Find all matches with their positions
  let match;
  const textToSearch = htmlContent;
  while ((match = scripturePattern.exec(textToSearch)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];

    // Skip if already inside a scripture-ref tag
    if (isAlreadyWrapped(textToSearch, matchIndex)) {
      continue;
    }

    // Skip if inside HTML tags
    const beforeMatch = textToSearch.substring(Math.max(0, matchIndex - 100), matchIndex);
    
    // Check if we're inside an HTML tag
    const lastOpenTag = beforeMatch.lastIndexOf("<");
    const lastCloseTag = beforeMatch.lastIndexOf(">");
    if (lastOpenTag > lastCloseTag) {
      continue; // Inside an opening tag
    }

    // Check if we're inside a closing tag
    const afterMatch = textToSearch.substring(matchIndex, matchIndex + matchText.length + 100);
    const nextCloseTag = afterMatch.indexOf(">");
    const nextOpenTag = afterMatch.indexOf("<");
    if (nextOpenTag !== -1 && nextOpenTag < nextCloseTag) {
      continue; // Inside a closing tag
    }

    matches.push({ match: matchText, index: matchIndex });
  }

  // Replace matches in reverse order to preserve indices
  let result = htmlContent;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { match: matchText, index } = matches[i];
    const normalizedRef = normalizeReference(matchText);
    const wrapped = `<scripture-ref data-ref="${normalizedRef}">${matchText}</scripture-ref>`;
    result = result.substring(0, index) + wrapped + result.substring(index + matchText.length);
  }

  return result;
}

/**
 * Extracts all scripture references from text
 * @param text - Plain text or HTML content
 * @returns Array of unique scripture references found
 */
export function extractScriptureReferences(text: string): string[] {
  const scripturePattern = /\b(?:\d+\s+)?[A-Za-z]+\.?\s+\d+:\d+(?:-\d+)?(?::\d+(?:-\d+)?)?\b/g;
  const matches = text.match(scripturePattern) || [];
  const unique = Array.from(new Set(matches.map(normalizeReference)));
  return unique;
}

