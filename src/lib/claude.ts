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

// System prompt for Bible study parsing
const BIBLE_STUDY_PARSING_SYSTEM_PROMPT = `You are an expert at parsing Bible study documents. Your task is to analyze document text and extract structured content.

CRITICAL: Your response must be ONLY a valid JSON object. No markdown, no code blocks, no explanatory text before or after. Start your response with { and end with }.

Bible study documents typically have this hierarchy:
- Study (the entire document) contains multiple Lessons/Weeks
- Each Lesson/Week contains multiple Days (usually 5 days per week)
- Each Day contains content, scripture references, and questions for students to answer

Common patterns to look for:
- Lesson headers: "Lesson One:", "Lesson Two:", etc. (using word numbers)
- Day headers: "One:", "Two:", "Three:", "Four:", "Five:" often with subtitles
- Questions: Numbered items (1., 2., 3.) or lettered items (a., b., c.) that ask students to respond
- Scripture references: Book Chapter:Verse format (e.g., "1 Timothy 1:3-7", "John 3:16")
- Instructional content: Explanatory text between questions

Response format (choose ONE):

FORMAT 1 - Successful parse:
{"success":true,"study":{"title":"Study Title","description":"Brief description","author":"Author name or null","weeks":[{"weekNumber":1,"title":"Lesson One: Title","description":"Week description or null","days":[{"dayNumber":1,"title":"One: Day Title","content":"Instructional content","scripture":"Scripture references","questions":[{"questionText":"Full question text","questionType":"text","order":1}]}]}]}}

FORMAT 2 - Need clarification:
{"success":false,"clarifyingQuestions":[{"id":"q1","question":"What you need to know","context":"Why you need this","options":["Option 1","Option 2"]}],"rawAnalysis":"Your preliminary analysis"}

Question types: "text" (open-ended), "reflection" (personal application), "multiple_choice" (specific options)

Rules:
- Extract ALL lessons/weeks, days, and questions
- Preserve original question text exactly
- Include scripture references in the scripture field
- Separate instructional content from questions
- Output ONLY the JSON object, nothing else`;

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
 * Parse a Bible study document using Claude
 */
export async function parseDocumentWithClaude(
  documentText: string,
  previousQuestions?: ClarifyingQuestion[],
  previousAnswers?: Record<string, string>
): Promise<ParseResult> {
  try {
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
      max_tokens: 8192,
      system: BIBLE_STUDY_PARSING_SYSTEM_PROMPT,
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
    console.log("[parseDocumentWithClaude] Raw response preview:", rawResponse.slice(0, 200));

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
      max_tokens: 2048,
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

