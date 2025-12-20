import Anthropic from "@anthropic-ai/sdk";

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define the expected parsed structure
export interface ParsedQuestion {
  questionText: string;
  questionType: "text" | "multiple_choice" | "reflection";
  order: number;
}

export interface ParsedDay {
  dayNumber: number;
  title: string;
  content: string | null;
  scripture: string | null;
  questions: ParsedQuestion[];
}

export interface ParsedWeek {
  weekNumber: number;
  title: string;
  description: string | null;
  days: ParsedDay[];
}

export interface ParsedStudy {
  title: string;
  description: string | null;
  author: string | null;
  weeks: ParsedWeek[];
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  context: string;
  options?: string[];
}

export interface ParseResult {
  success: boolean;
  study?: ParsedStudy;
  clarifyingQuestions?: ClarifyingQuestion[];
  rawAnalysis?: string;
  error?: string;
}

// Large document threshold (characters)
const LARGE_DOCUMENT_THRESHOLD = 50000;

// System prompt for Bible study parsing - concise mode for large documents
const BIBLE_STUDY_PARSING_SYSTEM_PROMPT_CONCISE = `You are an expert at parsing Bible study documents. Extract the STRUCTURE only - be concise to save tokens.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no text. Start with { end with }.

Document hierarchy:
- Study → Lessons/Weeks → Days (usually 5/week) → Questions

Look for:
- Lesson headers: "Lesson One:", "Lesson Two:", etc.
- Day headers: "One:", "Two:", "Three:", "Four:", "Five:" with subtitles
- Questions: Numbered (1., 2., 3.) or lettered (a., b., c.) items

BE CONCISE - this is a structure extraction pass:
- For "content": Use max 100 chars summary, not full text
- For "questions": Include ALL questions but truncate questionText to first 150 chars if longer
- For "scripture": Just list the references, no full verses

Output format:
{"success":true,"study":{"title":"Title","description":"Brief desc","author":"Author or null","weeks":[{"weekNumber":1,"title":"Lesson One: Title","description":null,"days":[{"dayNumber":1,"title":"One: Day Title","content":"[Brief summary]","scripture":"1 Tim 1:3-7","questions":[{"questionText":"Question text (truncated if long)...","questionType":"text","order":1}]}]}]}}

Extract ALL weeks, ALL days, ALL questions. Be concise but complete.`;

// System prompt for Bible study parsing - full mode for smaller documents  
const BIBLE_STUDY_PARSING_SYSTEM_PROMPT_FULL = `You are an expert at parsing Bible study documents. Extract structured content completely.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanatory text. Start with { end with }.

Document hierarchy:
- Study → Lessons/Weeks → Days (usually 5/week) → Questions

Look for:
- Lesson headers: "Lesson One:", "Lesson Two:", etc. (word numbers)
- Day headers: "One:", "Two:", "Three:", "Four:", "Five:" with subtitles
- Questions: Numbered (1., 2., 3.) or lettered (a., b., c.) items
- Scripture: Book Chapter:Verse format (e.g., "1 Timothy 1:3-7")

Output format:
{"success":true,"study":{"title":"Study Title","description":"Brief description","author":"Author or null","weeks":[{"weekNumber":1,"title":"Lesson One: Title","description":"Week description or null","days":[{"dayNumber":1,"title":"One: Day Title","content":"Instructional content","scripture":"Scripture refs","questions":[{"questionText":"Full question text","questionType":"text","order":1}]}]}]}}

If clarification needed:
{"success":false,"clarifyingQuestions":[{"id":"q1","question":"What you need","context":"Why","options":["A","B"]}],"rawAnalysis":"Your analysis"}

Question types: "text", "reflection", "multiple_choice"
Extract ALL weeks, days, and questions. Preserve original question text.`;

// System prompt for parsing a single lesson/week
const SINGLE_LESSON_PARSING_PROMPT = `Parse this SINGLE lesson/week from a Bible study. Extract all days and questions.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks. Start with { end with }.

Output format:
{"weekNumber":1,"title":"Lesson Title","description":null,"days":[{"dayNumber":1,"title":"Day Title","content":"Content summary","scripture":"References","questions":[{"questionText":"Question","questionType":"text","order":1}]}]}

Extract ALL days and ALL questions from this lesson.`;

/**
 * Extract JSON from a string that might contain markdown or extra text
 */
function extractJSON(text: string): string {
  // First, try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim();
    // Verify it looks like JSON
    if (extracted.startsWith("{") || extracted.startsWith("[")) {
      return extracted;
    }
  }

  // Try to find JSON object by looking for first { and last }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  // Try to find JSON array by looking for first [ and last ]
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    // Only use array if it comes before any object or there's no object
    if (firstBrace === -1 || firstBracket < firstBrace) {
      return text.slice(firstBracket, lastBracket + 1);
    }
  }

  // Return the trimmed text as-is if no JSON structure found
  return text.trim();
}

/**
 * Safely parse JSON with detailed error logging
 */
function safeParseJSON<T>(text: string, context: string): { success: true; data: T } | { success: false; error: string } {
  try {
    const extracted = extractJSON(text);
    const parsed = JSON.parse(extracted) as T;
    return { success: true, data: parsed };
  } catch (error) {
    console.error(`[${context}] Failed to parse JSON:`);
    console.error(`[${context}] Raw text (first 500 chars):`, text.slice(0, 500));
    console.error(`[${context}] Extracted JSON attempt:`, extractJSON(text).slice(0, 500));
    console.error(`[${context}] Parse error:`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown parse error",
    };
  }
}

/**
 * Split a document into lesson chunks based on common patterns
 */
function splitDocumentIntoLessons(documentText: string): string[] {
  // Common lesson header patterns
  const lessonPatterns = [
    /\n(?=Lesson\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty)[:\s])/gi,
    /\n(?=LESSON\s+(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE)[:\s])/g,
    /\n(?=Week\s+\d+[:\s])/gi,
    /\n(?=WEEK\s+\d+[:\s])/g,
    /\n(?=Chapter\s+\d+[:\s])/gi,
  ];

  for (const pattern of lessonPatterns) {
    const parts = documentText.split(pattern);
    if (parts.length > 1) {
      // Filter out empty parts and very short parts (likely just whitespace)
      const validParts = parts.filter(p => p.trim().length > 100);
      if (validParts.length > 1) {
        console.log(`[splitDocumentIntoLessons] Split into ${validParts.length} lessons`);
        return validParts;
      }
    }
  }

  // If no pattern matched, return the whole document
  return [documentText];
}

/**
 * Parse a single lesson chunk
 */
async function parseSingleLesson(
  lessonText: string,
  lessonIndex: number
): Promise<ParsedWeek | null> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: SINGLE_LESSON_PARSING_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this lesson (Lesson ${lessonIndex + 1}):\n\n---\n${lessonText}\n---`,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      console.error(`[parseSingleLesson] No response for lesson ${lessonIndex + 1}`);
      return null;
    }

    const parseResult = safeParseJSON<ParsedWeek>(textContent.text, `parseSingleLesson-${lessonIndex}`);
    if (!parseResult.success) {
      console.error(`[parseSingleLesson] Failed to parse lesson ${lessonIndex + 1}`);
      return null;
    }

    // Ensure weekNumber is set correctly
    const week = parseResult.data;
    week.weekNumber = lessonIndex + 1;
    return week;
  } catch (error) {
    console.error(`[parseSingleLesson] Error parsing lesson ${lessonIndex + 1}:`, error);
    return null;
  }
}

/**
 * Parse a large document by splitting into lessons and parsing each separately
 */
async function parseLargeDocument(documentText: string): Promise<ParseResult> {
  console.log("[parseLargeDocument] Document is large, splitting into lessons...");
  
  const lessons = splitDocumentIntoLessons(documentText);
  
  if (lessons.length === 1) {
    // Couldn't split, try with concise mode on the full document
    console.log("[parseLargeDocument] Could not split, using concise mode on full document");
    return parseDocumentConcise(documentText);
  }

  // First, get the study title and description from the beginning
  const headerSection = documentText.slice(0, 3000);
  let studyTitle = "Bible Study";
  let studyDescription: string | null = null;
  let studyAuthor: string | null = null;

  try {
    const headerResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Extract ONLY the study title, description, and author from this document header. Output JSON only:
{"title":"Study Title","description":"Brief description or null","author":"Author name or null"}

Header:
---
${headerSection}
---`,
        },
      ],
    });

    const textContent = headerResponse.content.find((block) => block.type === "text");
    if (textContent && textContent.type === "text") {
      const headerParse = safeParseJSON<{ title: string; description: string | null; author: string | null }>(
        textContent.text,
        "parseHeader"
      );
      if (headerParse.success) {
        studyTitle = headerParse.data.title || studyTitle;
        studyDescription = headerParse.data.description;
        studyAuthor = headerParse.data.author;
      }
    }
  } catch (error) {
    console.error("[parseLargeDocument] Error parsing header:", error);
  }

  // Parse each lesson in parallel (with some concurrency limit)
  const weeks: ParsedWeek[] = [];
  const BATCH_SIZE = 3; // Parse 3 lessons at a time

  for (let i = 0; i < lessons.length; i += BATCH_SIZE) {
    const batch = lessons.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((lesson, batchIndex) => parseSingleLesson(lesson, i + batchIndex))
    );
    
    for (const week of batchResults) {
      if (week) {
        weeks.push(week);
      }
    }
  }

  if (weeks.length === 0) {
    return {
      success: false,
      error: "Could not parse any lessons from the document. Please check the document format.",
    };
  }

  // Sort weeks by weekNumber
  weeks.sort((a, b) => a.weekNumber - b.weekNumber);

  return {
    success: true,
    study: {
      title: studyTitle,
      description: studyDescription,
      author: studyAuthor,
      weeks,
    },
  };
}

/**
 * Parse document in concise mode (for large documents that can't be split)
 */
async function parseDocumentConcise(documentText: string): Promise<ParseResult> {
  try {
    // Truncate document if extremely large
    const maxDocLength = 80000;
    const truncatedText = documentText.length > maxDocLength
      ? documentText.slice(0, maxDocLength) + "\n\n[Document truncated for processing...]"
      : documentText;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: BIBLE_STUDY_PARSING_SYSTEM_PROMPT_CONCISE,
      messages: [
        {
          role: "user",
          content: `Parse this Bible study document (structure extraction mode):\n\n---\n${truncatedText}\n---`,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return {
        success: false,
        error: "No text response from Claude",
      };
    }

    const rawResponse = textContent.text;
    console.log("[parseDocumentConcise] Response length:", rawResponse.length);
    console.log("[parseDocumentConcise] Stop reason:", response.stop_reason);

    // Check if response was cut off
    if (response.stop_reason === "max_tokens") {
      console.warn("[parseDocumentConcise] Response was truncated due to max_tokens");
      // Try to salvage partial JSON
      const partialResult = attemptPartialJSONParse(rawResponse);
      if (partialResult) {
        return partialResult;
      }
      return {
        success: false,
        error: "Response was too large. Try uploading a smaller document or contact support.",
      };
    }

    const parseResult = safeParseJSON<ParseResult>(rawResponse, "parseDocumentConcise");
    
    if (!parseResult.success) {
      return {
        success: false,
        error: `Failed to parse response: ${parseResult.error}`,
      };
    }

    return parseResult.data;
  } catch (error) {
    console.error("[parseDocumentConcise] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Attempt to parse a partial/truncated JSON response
 */
function attemptPartialJSONParse(text: string): ParseResult | null {
  try {
    // Try to find and fix incomplete JSON
    let jsonText = extractJSON(text);
    
    // Count braces to see how many are missing
    const openBraces = (jsonText.match(/{/g) || []).length;
    const closeBraces = (jsonText.match(/}/g) || []).length;
    const openBrackets = (jsonText.match(/\[/g) || []).length;
    const closeBrackets = (jsonText.match(/]/g) || []).length;

    // Add missing closing brackets/braces
    const missingBrackets = openBrackets - closeBrackets;
    const missingBraces = openBraces - closeBraces;

    if (missingBrackets > 0 || missingBraces > 0) {
      // Trim any incomplete property at the end
      jsonText = jsonText.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, "");
      jsonText = jsonText.replace(/,\s*$/, "");
      
      // Add missing closures
      jsonText += "]".repeat(Math.max(0, missingBrackets));
      jsonText += "}".repeat(Math.max(0, missingBraces));

      console.log("[attemptPartialJSONParse] Attempted to fix JSON, added", missingBrackets, "brackets and", missingBraces, "braces");
      
      const result = JSON.parse(jsonText) as ParseResult;
      if (result.study) {
        console.log("[attemptPartialJSONParse] Successfully recovered partial data");
        return result;
      }
    }
  } catch (error) {
    console.error("[attemptPartialJSONParse] Could not recover:", error);
  }
  return null;
}

/**
 * Parse a Bible study document using Claude
 */
export async function parseDocumentWithClaude(
  documentText: string,
  previousQuestions?: ClarifyingQuestion[],
  previousAnswers?: Record<string, string>
): Promise<ParseResult> {
  try {
    const docLength = documentText.length;
    console.log(`[parseDocumentWithClaude] Document length: ${docLength} characters`);

    // For large documents, use chunking strategy
    if (docLength > LARGE_DOCUMENT_THRESHOLD) {
      console.log("[parseDocumentWithClaude] Large document detected, using chunking strategy");
      return parseLargeDocument(documentText);
    }

    // For smaller documents, use full parsing mode
    let userMessage = `Please parse this Bible study document and extract its structure:\n\n---\n${documentText}\n---`;

    // If there were previous clarifying questions and answers, include them
    if (previousQuestions && previousAnswers) {
      const answersText = previousQuestions
        .map((q) => `Q: ${q.question}\nA: ${previousAnswers[q.id] || "Not provided"}`)
        .join("\n\n");
      userMessage = `Based on the previous clarifying questions, here are the answers:\n\n${answersText}\n\nNow please parse the document with this additional context:\n\n---\n${documentText}\n---`;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: BIBLE_STUDY_PARSING_SYSTEM_PROMPT_FULL,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract the text content from the response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return {
        success: false,
        error: "No text response from Claude",
      };
    }

    const rawResponse = textContent.text;
    console.log("[parseDocumentWithClaude] Raw response length:", rawResponse.length);
    console.log("[parseDocumentWithClaude] Stop reason:", response.stop_reason);

    // Check if response was cut off
    if (response.stop_reason === "max_tokens") {
      console.warn("[parseDocumentWithClaude] Response truncated, attempting recovery...");
      const partialResult = attemptPartialJSONParse(rawResponse);
      if (partialResult) {
        return partialResult;
      }
      // Fall back to chunking
      console.log("[parseDocumentWithClaude] Recovery failed, trying chunking strategy");
      return parseLargeDocument(documentText);
    }

    // Parse the JSON response using our robust parser
    const parseResult = safeParseJSON<ParseResult>(rawResponse, "parseDocumentWithClaude");
    
    if (!parseResult.success) {
      return {
        success: false,
        error: `Failed to parse Claude's response as JSON: ${parseResult.error}. Please try again.`,
      };
    }

    return parseResult.data;
  } catch (error) {
    console.error("[parseDocumentWithClaude] Error:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

interface AnalysisResult {
  summary: string;
  confidence: number;
  potentialIssues: string[];
}

/**
 * Analyze a document and provide a summary of its structure
 */
export async function analyzeDocumentStructure(
  documentText: string
): Promise<AnalysisResult> {
  const defaultError: AnalysisResult = {
    summary: "Error analyzing document",
    confidence: 0,
    potentialIssues: [],
  };

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Analyze this Bible study document and provide a brief summary of its structure.

IMPORTANT: Respond with ONLY a JSON object, no markdown, no code blocks, no extra text. Start with { and end with }.

Required format:
{"summary":"A brief description of what you found","confidence":0.85,"potentialIssues":["Issue 1","Issue 2"]}

Document:
---
${documentText.slice(0, 10000)}
---`,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return {
        ...defaultError,
        potentialIssues: ["No response from Claude"],
      };
    }

    const rawResponse = textContent.text;
    console.log("[analyzeDocumentStructure] Raw response preview:", rawResponse.slice(0, 200));

    const parseResult = safeParseJSON<AnalysisResult>(rawResponse, "analyzeDocumentStructure");
    
    if (!parseResult.success) {
      return {
        ...defaultError,
        potentialIssues: [`Failed to parse analysis: ${parseResult.error}`],
      };
    }

    return parseResult.data;
  } catch (error) {
    console.error("[analyzeDocumentStructure] Error:", error);
    return {
      ...defaultError,
      potentialIssues: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

