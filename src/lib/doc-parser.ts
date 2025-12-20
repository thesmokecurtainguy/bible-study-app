import mammoth from "mammoth";
import {
  parseDocumentWithClaude,
  analyzeDocumentStructure,
  ParseResult,
  ParsedStudy,
  ClarifyingQuestion,
} from "./claude";

export interface DocumentParseOptions {
  // If provided, these are answers to previous clarifying questions
  clarifyingAnswers?: Record<string, string>;
  // If provided, these are the previous clarifying questions
  previousQuestions?: ClarifyingQuestion[];
}

export interface DocumentParseResult {
  success: boolean;
  study?: ParsedStudy;
  clarifyingQuestions?: ClarifyingQuestion[];
  rawText?: string;
  analysis?: {
    summary: string;
    confidence: number;
    potentialIssues: string[];
  };
  error?: string;
}

/**
 * Extract text from a .docx file buffer
 */
export async function extractTextFromDocx(
  buffer: ArrayBuffer
): Promise<string> {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(buffer),
  });

  if (result.messages && result.messages.length > 0) {
    console.log("Mammoth extraction messages:", result.messages);
  }

  return result.value;
}

/**
 * Parse a Word document and extract structured Bible study content
 */
export async function parseDocument(
  buffer: ArrayBuffer,
  options: DocumentParseOptions = {}
): Promise<DocumentParseResult> {
  try {
    // Step 1: Extract text from the document
    const rawText = await extractTextFromDocx(buffer);

    if (!rawText || rawText.trim().length === 0) {
      return {
        success: false,
        error: "The document appears to be empty or could not be read.",
      };
    }

    // Step 2: First pass - analyze the document structure
    const analysis = await analyzeDocumentStructure(rawText);

    // Step 3: Parse the document with Claude
    const parseResult: ParseResult = await parseDocumentWithClaude(
      rawText,
      options.previousQuestions,
      options.clarifyingAnswers
    );

    if (parseResult.success && parseResult.study) {
      return {
        success: true,
        study: parseResult.study,
        rawText,
        analysis,
      };
    }

    // Claude needs clarification
    if (parseResult.clarifyingQuestions) {
      return {
        success: false,
        clarifyingQuestions: parseResult.clarifyingQuestions,
        rawText,
        analysis,
      };
    }

    // Parsing failed
    return {
      success: false,
      error: parseResult.error || "Failed to parse the document",
      rawText,
      analysis,
    };
  } catch (error) {
    console.error("Error parsing document:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Continue parsing after answering clarifying questions
 */
export async function continueParsingWithAnswers(
  rawText: string,
  previousQuestions: ClarifyingQuestion[],
  answers: Record<string, string>
): Promise<DocumentParseResult> {
  try {
    const parseResult = await parseDocumentWithClaude(
      rawText,
      previousQuestions,
      answers
    );

    if (parseResult.success && parseResult.study) {
      return {
        success: true,
        study: parseResult.study,
        rawText,
      };
    }

    // Still needs more clarification
    if (parseResult.clarifyingQuestions) {
      return {
        success: false,
        clarifyingQuestions: parseResult.clarifyingQuestions,
        rawText,
      };
    }

    return {
      success: false,
      error: parseResult.error || "Failed to parse the document",
      rawText,
    };
  } catch (error) {
    console.error("Error continuing parse:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Validate the parsed study structure
 */
export function validateParsedStudy(study: ParsedStudy): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!study.title || study.title.trim().length === 0) {
    errors.push("Study title is required");
  }

  if (!study.weeks || study.weeks.length === 0) {
    errors.push("Study must have at least one week/lesson");
  }

  // Validate weeks
  study.weeks?.forEach((week, weekIndex) => {
    if (!week.title || week.title.trim().length === 0) {
      errors.push(`Week ${weekIndex + 1} is missing a title`);
    }

    if (!week.days || week.days.length === 0) {
      warnings.push(`Week ${weekIndex + 1} has no days`);
    }

    // Validate days within each week
    week.days?.forEach((day, dayIndex) => {
      if (!day.title || day.title.trim().length === 0) {
        warnings.push(`Week ${weekIndex + 1}, Day ${dayIndex + 1} is missing a title`);
      }

      if (!day.questions || day.questions.length === 0) {
        warnings.push(
          `Week ${weekIndex + 1}, Day ${dayIndex + 1} has no questions`
        );
      }

      // Validate questions
      day.questions?.forEach((question, questionIndex) => {
        if (!question.questionText || question.questionText.trim().length === 0) {
          errors.push(
            `Week ${weekIndex + 1}, Day ${dayIndex + 1}, Question ${
              questionIndex + 1
            } is empty`
          );
        }
      });
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get statistics about the parsed study
 */
export function getStudyStats(study: ParsedStudy): {
  totalWeeks: number;
  totalDays: number;
  totalQuestions: number;
  averageQuestionsPerDay: number;
  averageDaysPerWeek: number;
} {
  let totalDays = 0;
  let totalQuestions = 0;

  study.weeks?.forEach((week) => {
    totalDays += week.days?.length || 0;
    week.days?.forEach((day) => {
      totalQuestions += day.questions?.length || 0;
    });
  });

  const totalWeeks = study.weeks?.length || 0;

  return {
    totalWeeks,
    totalDays,
    totalQuestions,
    averageQuestionsPerDay: totalDays > 0 ? totalQuestions / totalDays : 0,
    averageDaysPerWeek: totalWeeks > 0 ? totalDays / totalWeeks : 0,
  };
}

