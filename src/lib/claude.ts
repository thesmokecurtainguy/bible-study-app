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

You must output ONLY valid JSON in one of these formats:

1. If you can parse the document successfully:
{
  "success": true,
  "study": {
    "title": "Study Title",
    "description": "Brief description of the study",
    "author": "Author name if found, or null",
    "weeks": [
      {
        "weekNumber": 1,
        "title": "Lesson One: Title Here",
        "description": "Week description if available",
        "days": [
          {
            "dayNumber": 1,
            "title": "One: Day Title",
            "content": "Instructional content for the day",
            "scripture": "Scripture references for the day",
            "questions": [
              {
                "questionText": "The full question text",
                "questionType": "text",
                "order": 1
              }
            ]
          }
        ]
      }
    ]
  }
}

2. If you need clarification:
{
  "success": false,
  "clarifyingQuestions": [
    {
      "id": "q1",
      "question": "What you need to know",
      "context": "Why you need this information",
      "options": ["Option 1", "Option 2"]
    }
  ],
  "rawAnalysis": "Your preliminary analysis of the document structure"
}

Question types:
- "text": Open-ended questions requiring written responses
- "reflection": Personal reflection questions (often about application to life)
- "multiple_choice": Questions with specific answer options

IMPORTANT:
- Extract ALL lessons/weeks found in the document
- Extract ALL days within each lesson
- Extract ALL questions within each day
- Preserve the original question text exactly
- Include any scripture references
- Separate instructional content from questions`;

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

    // Parse the JSON response
    const jsonText = textContent.text.trim();
    
    // Try to extract JSON from the response (it might have markdown code blocks)
    let jsonContent = jsonText;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonContent) as ParseResult;
    return result;
  } catch (error) {
    console.error("Error parsing document with Claude:", error);
    
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: "Failed to parse Claude's response as JSON. Please try again.",
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Analyze a document and provide a summary of its structure
 */
export async function analyzeDocumentStructure(
  documentText: string
): Promise<{ summary: string; confidence: number; potentialIssues: string[] }> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Analyze this Bible study document and provide a brief summary of its structure. Output JSON only:

{
  "summary": "A brief description of what you found",
  "confidence": 0.0-1.0 (how confident you are in parsing this),
  "potentialIssues": ["List of any issues or ambiguities found"]
}

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
        summary: "Could not analyze document",
        confidence: 0,
        potentialIssues: ["No response from Claude"],
      };
    }

    let jsonContent = textContent.text.trim();
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    return JSON.parse(jsonContent);
  } catch (error) {
    console.error("Error analyzing document:", error);
    return {
      summary: "Error analyzing document",
      confidence: 0,
      potentialIssues: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

