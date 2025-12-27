/**
 * ESV API integration for fetching Bible passages
 * Free tier: https://api.esv.org/
 */

const ESV_API_BASE_URL = "https://api.esv.org/v3/passage/text/";

export interface ESVPassageResult {
  passage: string;
  reference: string;
  translation: "ESV";
}

export interface ESVAPIOptions {
  includeFootnotes?: boolean;
  includeHeadings?: boolean;
  includeVerseNumbers?: boolean;
  includeShorts?: boolean;
}

/**
 * Fetches a Bible passage from the ESV API
 * @param reference - Scripture reference (e.g., "John 4:1-15")
 * @param options - Optional API parameters
 * @returns Passage result or null if error
 */
export async function getESVPassage(
  reference: string,
  options: ESVAPIOptions = {}
): Promise<ESVPassageResult | null> {
  const apiKey = process.env.ESV_API_KEY;

  if (!apiKey) {
    console.warn("ESV_API_KEY not configured");
    return null;
  }

  const {
    includeFootnotes = false,
    includeHeadings = true,
    includeVerseNumbers = true,
    includeShorts = false,
  } = options;

  try {
    const params = new URLSearchParams({
      q: reference,
      "include-footnotes": includeFootnotes.toString(),
      "include-headings": includeHeadings.toString(),
      "include-verse-numbers": includeVerseNumbers.toString(),
      "include-short-copyright": includeShorts.toString(),
      "include-passage-references": "false",
    });

    const response = await fetch(`${ESV_API_BASE_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    if (!response.ok) {
      // Handle rate limiting (429) or other errors
      if (response.status === 429) {
        console.warn("ESV API rate limit exceeded");
        return null;
      }
      throw new Error(`ESV API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.passages || data.passages.length === 0) {
      console.warn(`No passage found for reference: ${reference}`);
      return null;
    }

    return {
      passage: data.passages[0].trim(),
      reference: reference,
      translation: "ESV",
    };
  } catch (error) {
    console.error("Error fetching ESV passage:", error);
    return null;
  }
}

