"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RichTextEditor from "@/components/ui/rich-text-editor";
import RichTextDisplay from "@/components/ui/rich-text-display";
import { ScriptureContent } from "@/components/bible/scripture-content";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface QuestionAnswerProps {
  question: {
    id: string;
    questionText: string;
    questionType: string;
    order: number;
  };
  existingAnswer?: {
    id: string;
    answerText: string;
    updatedAt: Date;
  } | null;
  questionIndex: number;
}

export function QuestionAnswer({ question, existingAnswer, questionIndex }: QuestionAnswerProps) {
  const [content, setContent] = useState(existingAnswer?.answerText || "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(
    existingAnswer?.updatedAt ? new Date(existingAnswer.updatedAt) : null
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const isReflection = question.questionType === "reflection";

  const saveAnswer = useCallback(async (answerText: string) => {
    if (isReflection) return;

    setSaveStatus("saving");

    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: question.id,
          answerText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      const data = await response.json();
      setSaveStatus("saved");
      setLastSaved(new Date(data.answer.updatedAt));

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Error saving answer:", error);
      setSaveStatus("error");

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 5000);
    }
  }, [question.id, isReflection]);

  const handleChange = useCallback((html: string) => {
    setContent(html);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after last change)
    timeoutRef.current = setTimeout(() => {
      saveAnswer(html);
    }, 2000);
  }, [saveAnswer]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Skip save on first render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
  }, []);

  const hasAnswer = content && content !== "<p></p>";

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span
            className={`
              flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium shrink-0
              ${hasAnswer
                ? "bg-green-100 text-green-700"
                : isReflection
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }
            `}
          >
            {hasAnswer ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              questionIndex + 1
            )}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {isReflection && (
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                  Reflection
                </Badge>
              )}
            </div>
            <CardTitle className="text-base font-medium text-gray-900 leading-relaxed">
              <ScriptureContent htmlContent={question.questionText} />
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      {!isReflection && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <RichTextEditor
              content={content}
              onChange={handleChange}
              placeholder="Write your thoughts here..."
              minHeight="120px"
              className="bg-gray-50 focus-within:bg-white"
            />

            {/* Save Status Indicator */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {saveStatus === "saving" && (
                  <span className="text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="text-green-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="text-red-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Error saving - try again
                  </span>
                )}
              </div>

              {lastSaved && saveStatus === "idle" && (
                <span className="text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default QuestionAnswer;

