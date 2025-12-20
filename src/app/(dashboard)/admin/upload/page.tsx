"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ParsedStudy, ParsedWeek, ParsedDay, ParsedQuestion, ClarifyingQuestion } from "@/lib/claude";

interface UploadState {
  status: "idle" | "uploading" | "analyzing" | "clarifying" | "preview" | "saving" | "success" | "error";
  error?: string;
  study?: ParsedStudy;
  clarifyingQuestions?: ClarifyingQuestion[];
  rawText?: string;
  analysis?: {
    summary: string;
    confidence: number;
    potentialIssues: string[];
  };
}

// Inline editable text component
function EditableText({
  value,
  onChange,
  placeholder = "Click to edit",
  className = "",
  multiline = false,
  as: Component = "span",
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  as?: "span" | "p" | "h3";
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || "");
  }, [value]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleSave();
    }
    if (e.key === "Escape") {
      setEditValue(value || "");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`w-full px-2 py-1 border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white ${className}`}
          rows={3}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`px-2 py-1 border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white ${className}`}
      />
    );
  }

  return (
    <Component
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-amber-50 rounded px-1 -mx-1 group inline-flex items-center gap-1 ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-stone-400 italic">{placeholder}</span>}
      <svg
        className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </Component>
  );
}

// Delete confirmation button
function DeleteButton({
  onDelete,
  itemName,
  size = "sm",
}: {
  onDelete: () => void;
  itemName: string;
  size?: "sm" | "md";
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            onDelete();
            setConfirming(false);
          }}
          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 text-xs bg-stone-200 text-stone-600 rounded hover:bg-stone-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`text-stone-400 hover:text-red-500 transition-colors ${size === "sm" ? "p-1" : "p-2"}`}
      title={`Delete ${itemName}`}
    >
      <svg className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

export default function AdminUploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [publishSettings, setPublishSettings] = useState({
    isPublished: false,
    isPremium: false,
    price: 0,
  });
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // === EDITING FUNCTIONS ===

  // Update study metadata
  const updateStudyField = (field: keyof ParsedStudy, value: string | null) => {
    if (!state.study) return;
    setState((prev) => ({
      ...prev,
      study: { ...prev.study!, [field]: value },
    }));
  };

  // Update week
  const updateWeek = (weekIndex: number, field: keyof ParsedWeek, value: string | null) => {
    if (!state.study) return;
    const newWeeks = [...state.study.weeks];
    newWeeks[weekIndex] = { ...newWeeks[weekIndex], [field]: value };
    setState((prev) => ({
      ...prev,
      study: { ...prev.study!, weeks: newWeeks },
    }));
  };

  // Delete week
  const deleteWeek = (weekIndex: number) => {
    if (!state.study) return;
    const newWeeks = state.study.weeks.filter((_, i) => i !== weekIndex);
    // Renumber remaining weeks
    newWeeks.forEach((week, i) => {
      week.weekNumber = i + 1;
    });
    setState((prev) => ({
      ...prev,
      study: { ...prev.study!, weeks: newWeeks },
    }));
    // Update expanded state
    setExpandedWeeks((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < weekIndex) next.add(idx);
        else if (idx > weekIndex) next.add(idx - 1);
      });
      return next;
    });
  };

  // Update day
  const updateDay = (weekIndex: number, dayIndex: number, field: keyof ParsedDay, value: string | null) => {
    if (!state.study) return;
    const newWeeks = [...state.study.weeks];
    const newDays = [...(newWeeks[weekIndex].days || [])];
    newDays[dayIndex] = { ...newDays[dayIndex], [field]: value };
    newWeeks[weekIndex] = { ...newWeeks[weekIndex], days: newDays };
    setState((prev) => ({
      ...prev,
      study: { ...prev.study!, weeks: newWeeks },
    }));
  };

  // Delete day
  const deleteDay = (weekIndex: number, dayIndex: number) => {
    if (!state.study) return;
    const newWeeks = [...state.study.weeks];
    const newDays = (newWeeks[weekIndex].days || []).filter((_, i) => i !== dayIndex);
    // Renumber remaining days
    newDays.forEach((day, i) => {
      day.dayNumber = i + 1;
    });
    newWeeks[weekIndex] = { ...newWeeks[weekIndex], days: newDays };
    setState((prev) => ({
      ...prev,
      study: { ...prev.study!, weeks: newWeeks },
    }));
  };

  // Update question
  const updateQuestion = (
    weekIndex: number,
    dayIndex: number,
    questionIndex: number,
    field: keyof ParsedQuestion,
    value: string | number
  ) => {
    if (!state.study) return;
    const newWeeks = [...state.study.weeks];
    const newDays = [...(newWeeks[weekIndex].days || [])];
    const newQuestions = [...(newDays[dayIndex].questions || [])];
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], [field]: value };
    newDays[dayIndex] = { ...newDays[dayIndex], questions: newQuestions };
    newWeeks[weekIndex] = { ...newWeeks[weekIndex], days: newDays };
    setState((prev) => ({
      ...prev,
      study: { ...prev.study!, weeks: newWeeks },
    }));
  };

  // Delete question
  const deleteQuestion = (weekIndex: number, dayIndex: number, questionIndex: number) => {
    if (!state.study) return;
    const newWeeks = [...state.study.weeks];
    const newDays = [...(newWeeks[weekIndex].days || [])];
    const newQuestions = (newDays[dayIndex].questions || []).filter((_, i) => i !== questionIndex);
    // Renumber remaining questions
    newQuestions.forEach((q, i) => {
      q.order = i + 1;
    });
    newDays[dayIndex] = { ...newDays[dayIndex], questions: newQuestions };
    newWeeks[weekIndex] = { ...newWeeks[weekIndex], days: newDays };
    setState((prev) => ({
      ...prev,
      study: { ...prev.study!, weeks: newWeeks },
    }));
  };

  // Add question
  const addQuestion = (weekIndex: number, dayIndex: number) => {
    if (!state.study) return;
    const newWeeks = [...state.study.weeks];
    const newDays = [...(newWeeks[weekIndex].days || [])];
    const existingQuestions = newDays[dayIndex].questions || [];
    const newQuestion: ParsedQuestion = {
      questionText: "New question - click to edit",
      questionType: "text",
      order: existingQuestions.length + 1,
    };
    newDays[dayIndex] = { ...newDays[dayIndex], questions: [...existingQuestions, newQuestion] };
    newWeeks[weekIndex] = { ...newWeeks[weekIndex], days: newDays };
    setState((prev) => ({
      ...prev,
      study: { ...prev.study!, weeks: newWeeks },
    }));
  };

  // === END EDITING FUNCTIONS ===

  // Redirect if not admin
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 animate-spin" />
          <p className="text-stone-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Admin Access Required</h2>
          <p className="text-stone-500">You need administrator privileges to upload studies.</p>
        </div>
        <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setState({ status: "idle" });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setState({ status: "uploading" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      setState({ status: "analyzing" });
      const response = await fetch("/api/admin/upload-study", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setState({
          status: "preview",
          study: data.study,
          analysis: data.analysis,
        });
        // Expand first week by default
        setExpandedWeeks(new Set([0]));
      } else if (data.clarifyingQuestions) {
        setState({
          status: "clarifying",
          clarifyingQuestions: data.clarifyingQuestions,
          rawText: data.rawText,
          analysis: data.analysis,
        });
        // Initialize answers
        const initialAnswers: Record<string, string> = {};
        data.clarifyingQuestions.forEach((q: ClarifyingQuestion) => {
          initialAnswers[q.id] = "";
        });
        setAnswers(initialAnswers);
      } else {
        setState({
          status: "error",
          error: data.error || "Failed to parse document",
        });
      }
    } catch (error) {
      setState({
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  const handleSubmitAnswers = async () => {
    if (!state.clarifyingQuestions || !state.rawText) return;

    setState((prev) => ({ ...prev, status: "analyzing" }));

    const formData = new FormData();
    formData.append("rawText", state.rawText);
    formData.append("previousQuestions", JSON.stringify(state.clarifyingQuestions));
    formData.append("clarifyingAnswers", JSON.stringify(answers));

    try {
      const response = await fetch("/api/admin/upload-study", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setState({
          status: "preview",
          study: data.study,
          analysis: data.analysis,
        });
        setExpandedWeeks(new Set([0]));
      } else if (data.clarifyingQuestions) {
        setState({
          status: "clarifying",
          clarifyingQuestions: data.clarifyingQuestions,
          rawText: data.rawText,
          analysis: data.analysis,
        });
        const initialAnswers: Record<string, string> = {};
        data.clarifyingQuestions.forEach((q: ClarifyingQuestion) => {
          initialAnswers[q.id] = "";
        });
        setAnswers(initialAnswers);
      } else {
        setState({
          status: "error",
          error: data.error || "Failed to parse document",
        });
      }
    } catch (error) {
      setState({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to submit answers",
      });
    }
  };

  const handleSaveStudy = async () => {
    if (!state.study) return;

    setState((prev) => ({ ...prev, status: "saving" }));

    try {
      const response = await fetch("/api/admin/save-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study: state.study,
          ...publishSettings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setState({ status: "success", study: data.study });
      } else {
        setState({
          status: "error",
          error: data.error || "Failed to save study",
          study: state.study,
        });
      }
    } catch (error) {
      setState({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to save study",
        study: state.study,
      });
    }
  };

  const toggleWeek = (weekIndex: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekIndex)) {
        next.delete(weekIndex);
      } else {
        next.add(weekIndex);
      }
      return next;
    });
  };

  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  const getStats = () => {
    if (!state.study) return null;
    let totalDays = 0;
    let totalQuestions = 0;
    state.study.weeks.forEach((week) => {
      totalDays += week.days?.length || 0;
      week.days?.forEach((day) => {
        totalQuestions += day.questions?.length || 0;
      });
    });
    return {
      weeks: state.study.weeks.length,
      days: totalDays,
      questions: totalQuestions,
    };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase">Admin Tool</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-800 mb-2">Upload Bible Study</h1>
          <p className="text-stone-600 max-w-xl">
            Upload a Word document (.docx) and let AI intelligently parse the study structure into lessons, days, and questions.
          </p>
        </div>
      </div>

      {/* Success State */}
      {state.status === "success" && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800 mb-1">Study Saved Successfully!</h3>
                <p className="text-green-600">&quot;{state.study?.title}&quot; has been added to the database.</p>
              </div>
              <div className="flex gap-3 mt-2">
                <Button
                  onClick={() => {
                    setState({ status: "idle" });
                    setFile(null);
                  }}
                >
                  Upload Another
                </Button>
                <Button variant="outline" onClick={() => router.push("/studies")}>
                  View Studies
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {state.status === "error" && (
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                <p className="text-red-600">{state.error}</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setState({ status: "idle" })}
                  >
                    Try Again
                  </Button>
                  {state.study && (
                    <Button
                      size="sm"
                      onClick={() => setState((prev) => ({ ...prev, status: "preview" }))}
                    >
                      Return to Preview
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      {(state.status === "idle" || state.status === "uploading" || state.status === "analyzing") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Select Document
            </CardTitle>
            <CardDescription>
              Upload a Word document (.docx) containing your Bible study content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center hover:border-amber-300 transition-colors">
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={state.status !== "idle"}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                {file ? (
                  <div>
                    <p className="font-medium text-stone-800">{file.name}</p>
                    <p className="text-sm text-stone-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-stone-600">Click to select a file</p>
                    <p className="text-sm text-stone-400">or drag and drop here</p>
                  </div>
                )}
              </label>
            </div>

            {file && (
              <Button
                onClick={handleUpload}
                isLoading={state.status === "uploading" || state.status === "analyzing"}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                disabled={state.status !== "idle"}
              >
                {state.status === "uploading" && "Uploading..."}
                {state.status === "analyzing" && "AI is analyzing the document..."}
                {state.status === "idle" && "Upload & Analyze with AI"}
              </Button>
            )}

            {state.status === "analyzing" && (
              <div className="flex items-center justify-center gap-3 text-stone-500 py-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-amber-100" />
                  </div>
                </div>
                <span className="font-medium">Claude is analyzing your document structure...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clarifying Questions */}
      {state.status === "clarifying" && state.clarifyingQuestions && (
        <Card className="border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Claude Needs Clarification
            </CardTitle>
            <CardDescription className="text-blue-600">
              Please answer these questions to help parse the document accurately
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {state.analysis && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-1">Initial Analysis:</p>
                <p className="text-sm text-blue-600">{state.analysis.summary}</p>
              </div>
            )}

            {state.clarifyingQuestions.map((q) => (
              <div key={q.id} className="space-y-3">
                <div>
                  <label className="block font-medium text-stone-800">{q.question}</label>
                  {q.context && (
                    <p className="text-sm text-stone-500 mt-1">{q.context}</p>
                  )}
                </div>
                {q.options && q.options.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: option }))}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          answers[q.id] === option
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Type your answer..."
                  />
                )}
              </div>
            ))}

            <Button
              onClick={handleSubmitAnswers}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              disabled={Object.values(answers).some((a) => !a.trim())}
            >
              Submit Answers & Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      {(state.status === "preview" || state.status === "saving") && state.study && (
        <>
          {/* Edit Instructions Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-amber-800">
              <p className="font-medium">Review and edit before saving</p>
              <p className="text-amber-600">Click on any text to edit it. Use the trash icons to delete items. All changes are made locally before saving to the database.</p>
            </div>
          </div>

          {/* Study Overview - Editable */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <EditableText
                    value={state.study.title}
                    onChange={(v) => updateStudyField("title", v)}
                    placeholder="Study Title"
                    className="text-xl font-bold text-stone-800"
                    as="h3"
                  />
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-stone-500">By</span>
                    <EditableText
                      value={state.study.author}
                      onChange={(v) => updateStudyField("author", v)}
                      placeholder="Author name"
                      className="text-sm text-stone-500"
                    />
                  </div>
                </div>
                {getStats() && (
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-amber-600">{getStats()!.weeks}</p>
                      <p className="text-stone-500">Weeks</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-amber-600">{getStats()!.days}</p>
                      <p className="text-stone-500">Days</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-amber-600">{getStats()!.questions}</p>
                      <p className="text-stone-500">Questions</p>
                    </div>
                  </div>
                )}
              </div>
              <EditableText
                value={state.study.description}
                onChange={(v) => updateStudyField("description", v)}
                placeholder="Add a study description..."
                className="text-stone-600 mt-2"
                multiline
                as="p"
              />
            </CardHeader>
          </Card>

          {/* Content Preview - Editable */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Content Preview
              </CardTitle>
              <CardDescription>
                Review and edit the parsed structure before saving
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.study.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="border border-stone-200 rounded-xl overflow-hidden">
                  {/* Week Header */}
                  <div className="flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 transition-colors">
                    <button
                      onClick={() => toggleWeek(weekIndex)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow">
                        {week.weekNumber}
                      </div>
                      <div>
                        <EditableText
                          value={week.title}
                          onChange={(v) => updateWeek(weekIndex, "title", v)}
                          placeholder="Week title"
                          className="font-semibold text-stone-800"
                        />
                        <p className="text-sm text-stone-500">{week.days?.length || 0} days</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <DeleteButton onDelete={() => deleteWeek(weekIndex)} itemName="week" />
                      <button onClick={() => toggleWeek(weekIndex)}>
                        <svg
                          className={`w-5 h-5 text-stone-400 transition-transform ${expandedWeeks.has(weekIndex) ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Week Content */}
                  {expandedWeeks.has(weekIndex) && (
                    <div className="p-4 space-y-3">
                      <EditableText
                        value={week.description}
                        onChange={(v) => updateWeek(weekIndex, "description", v)}
                        placeholder="Add week description..."
                        className="text-stone-600 text-sm italic"
                        multiline
                        as="p"
                      />
                      {week.days?.map((day, dayIndex) => {
                        const dayKey = `${weekIndex}-${dayIndex}`;
                        return (
                          <div key={dayIndex} className="border border-stone-100 rounded-lg overflow-hidden">
                            {/* Day Header */}
                            <div className="flex items-center justify-between p-3 bg-white hover:bg-stone-50 transition-colors">
                              <button
                                onClick={() => toggleDay(dayKey)}
                                className="flex items-center gap-2 flex-1 text-left"
                              >
                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-xs">
                                  {day.dayNumber}
                                </div>
                                <EditableText
                                  value={day.title}
                                  onChange={(v) => updateDay(weekIndex, dayIndex, "title", v)}
                                  placeholder="Day title"
                                  className="font-medium text-stone-700"
                                />
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-stone-400">{day.questions?.length || 0} questions</span>
                                <DeleteButton onDelete={() => deleteDay(weekIndex, dayIndex)} itemName="day" size="sm" />
                                <button onClick={() => toggleDay(dayKey)}>
                                  <svg
                                    className={`w-4 h-4 text-stone-400 transition-transform ${expandedDays.has(dayKey) ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Day Content */}
                            {expandedDays.has(dayKey) && (
                              <div className="p-3 bg-stone-50 border-t border-stone-100 space-y-3">
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                  <EditableText
                                    value={day.scripture}
                                    onChange={(v) => updateDay(weekIndex, dayIndex, "scripture", v)}
                                    placeholder="Add scripture reference..."
                                    className="text-sm text-amber-700 font-medium flex-1"
                                  />
                                </div>
                                <EditableText
                                  value={day.content}
                                  onChange={(v) => updateDay(weekIndex, dayIndex, "content", v)}
                                  placeholder="Add day content/instructions..."
                                  className="text-sm text-stone-600"
                                  multiline
                                  as="p"
                                />
                                {day.questions && day.questions.length > 0 && (
                                  <div className="space-y-2 mt-2">
                                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Questions:</p>
                                    {day.questions.map((q, qIndex) => (
                                      <div key={qIndex} className="flex items-start gap-2 text-sm bg-white p-2 rounded group">
                                        <span className="text-amber-600 font-medium flex-shrink-0">{q.order}.</span>
                                        <EditableText
                                          value={q.questionText}
                                          onChange={(v) => updateQuestion(weekIndex, dayIndex, qIndex, "questionText", v)}
                                          placeholder="Question text"
                                          className="text-stone-700 flex-1"
                                          multiline
                                        />
                                        <select
                                          value={q.questionType}
                                          onChange={(e) => updateQuestion(weekIndex, dayIndex, qIndex, "questionType", e.target.value)}
                                          className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded border-0 focus:ring-1 focus:ring-amber-500"
                                        >
                                          <option value="text">text</option>
                                          <option value="reflection">reflection</option>
                                          <option value="multiple_choice">multiple_choice</option>
                                        </select>
                                        <DeleteButton
                                          onDelete={() => deleteQuestion(weekIndex, dayIndex, qIndex)}
                                          itemName="question"
                                          size="sm"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <button
                                  onClick={() => addQuestion(weekIndex, dayIndex)}
                                  className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Add Question
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Publish Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                <div>
                  <p className="font-medium text-stone-800">Publish immediately</p>
                  <p className="text-sm text-stone-500">Make visible to users right away</p>
                </div>
                <button
                  onClick={() => setPublishSettings((p) => ({ ...p, isPublished: !p.isPublished }))}
                  className={`w-12 h-7 rounded-full transition-colors ${publishSettings.isPublished ? "bg-green-500" : "bg-stone-300"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${publishSettings.isPublished ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                <div>
                  <p className="font-medium text-stone-800">Premium content</p>
                  <p className="text-sm text-stone-500">Require purchase to access</p>
                </div>
                <button
                  onClick={() => setPublishSettings((p) => ({ ...p, isPremium: !p.isPremium }))}
                  className={`w-12 h-7 rounded-full transition-colors ${publishSettings.isPremium ? "bg-amber-500" : "bg-stone-300"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${publishSettings.isPremium ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {publishSettings.isPremium && (
                <div className="p-4 bg-stone-50 rounded-lg">
                  <label className="block font-medium text-stone-800 mb-2">Price (USD)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={publishSettings.price}
                    onChange={(e) => setPublishSettings((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                    className="max-w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setState({ status: "idle" });
                setFile(null);
              }}
              disabled={state.status === "saving"}
            >
              Start Over
            </Button>
            <Button
              onClick={handleSaveStudy}
              isLoading={state.status === "saving"}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {state.status === "saving" ? "Saving..." : "Save Study to Database"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
