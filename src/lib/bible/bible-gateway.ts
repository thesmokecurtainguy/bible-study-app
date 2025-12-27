/**
 * BibleGateway URL generator for fallback translations
 */

export type Translation = "ESV" | "NKJV" | "NIV" | "NASB";

const BIBLE_GATEWAY_VERSION_MAP: Record<Translation, string> = {
  ESV: "ESV",
  NKJV: "NKJV",
  NIV: "NIV",
  NASB: "NASB",
};

/**
 * Generates a BibleGateway URL for a scripture reference
 * @param reference - Scripture reference (e.g., "John 4:1-15")
 * @param translation - Bible translation
 * @returns BibleGateway URL
 */
export function getBibleGatewayUrl(reference: string, translation: Translation): string {
  const version = BIBLE_GATEWAY_VERSION_MAP[translation] || "ESV";
  const encodedReference = encodeURIComponent(reference);
  return `https://www.biblegateway.com/passage/?search=${encodedReference}&version=${version}`;
}

/**
 * Checks if a translation is available via API (currently only ESV)
 */
export function isTranslationAvailableViaAPI(translation: Translation): boolean {
  return translation === "ESV";
}

