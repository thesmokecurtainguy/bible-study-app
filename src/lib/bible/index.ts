/**
 * Unified Bible API interface
 */

import { getESVPassage } from "./esv-api";
import { getBibleGatewayUrl, isTranslationAvailableViaAPI, type Translation } from "./bible-gateway";

export type { Translation };

export interface PassageResult {
  reference: string;
  passage: string | null; // null if not available via API
  translation: Translation;
  source: "api" | "cache" | "fallback";
  bibleGatewayUrl: string;
}

/**
 * Fetches a Bible passage
 * @param reference - Scripture reference (e.g., "John 4:1-15")
 * @param translation - Bible translation
 * @returns Passage result
 */
export async function getPassage(
  reference: string,
  translation: Translation = "ESV"
): Promise<PassageResult> {
  const bibleGatewayUrl = getBibleGatewayUrl(reference, translation);

  // If translation is available via API (ESV), try to fetch
  if (isTranslationAvailableViaAPI(translation)) {
    const result = await getESVPassage(reference);
    if (result) {
      return {
        reference: result.reference,
        passage: result.passage,
        translation,
        source: "api",
        bibleGatewayUrl,
      };
    }
  }

  // Fallback: return null passage with BibleGateway URL
  return {
    reference,
    passage: null,
    translation,
    source: "fallback",
    bibleGatewayUrl,
  };
}

/**
 * Normalizes a scripture reference for consistent storage/lookup
 * Converts to lowercase and standardizes format
 */
export function normalizeReference(reference: string): string {
  return reference.toLowerCase().replace(/\s+/g, " ").trim();
}

