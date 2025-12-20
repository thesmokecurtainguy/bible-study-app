import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseDocument, continueParsingWithAnswers } from "@/lib/doc-parser";
import { ClarifyingQuestion } from "@/lib/claude";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    // Check if this is a follow-up with clarifying answers
    const rawTextFromPrevious = formData.get("rawText") as string | null;
    const previousQuestionsStr = formData.get("previousQuestions") as string | null;
    const clarifyingAnswersStr = formData.get("clarifyingAnswers") as string | null;

    // Handle follow-up parsing with answers
    if (rawTextFromPrevious && previousQuestionsStr && clarifyingAnswersStr) {
      const previousQuestions: ClarifyingQuestion[] = JSON.parse(previousQuestionsStr);
      const clarifyingAnswers: Record<string, string> = JSON.parse(clarifyingAnswersStr);

      const result = await continueParsingWithAnswers(
        rawTextFromPrevious,
        previousQuestions,
        clarifyingAnswers
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          study: result.study,
          analysis: result.analysis,
        });
      }

      // Still needs clarification or error
      return NextResponse.json({
        success: false,
        clarifyingQuestions: result.clarifyingQuestions,
        rawText: result.rawText,
        error: result.error,
      });
    }

    // Initial file upload
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a .docx file." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Get file buffer
    const buffer = await file.arrayBuffer();

    // Parse the document
    const result = await parseDocument(buffer);

    if (result.success) {
      return NextResponse.json({
        success: true,
        study: result.study,
        analysis: result.analysis,
      });
    }

    // Claude needs clarification
    if (result.clarifyingQuestions) {
      return NextResponse.json({
        success: false,
        clarifyingQuestions: result.clarifyingQuestions,
        rawText: result.rawText,
        analysis: result.analysis,
      });
    }

    // Parsing failed
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        analysis: result.analysis,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing upload:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process upload",
      },
      { status: 500 }
    );
  }
}

