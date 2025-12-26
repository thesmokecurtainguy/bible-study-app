"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import RichTextEditor from "@/components/ui/rich-text-editor";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  order: number;
}

interface Day {
  id: string;
  dayNumber: number;
  title: string;
  content: string;
  scripture: string;
  questions: Question[];
}

interface Week {
  id: string;
  weekNumber: number;
  title: string;
  description: string;
  days: Day[];
}

interface Study {
  id: string;
  title: string;
  description: string;
  author: string;
  coverImage: string;
  price: number;
  isPublished: boolean;
  isPremium: boolean;
  weeks: Week[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface StudyEditorProps {
  study: Study;
}

export default function StudyEditor({ study: initialStudy }: StudyEditorProps) {
  const router = useRouter();
  const [study, setStudy] = useState<Study>(initialStudy);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);

  // Update study metadata
  const updateStudyField = useCallback(<K extends keyof Study>(field: K, value: Study[K]) => {
    setStudy((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Week operations
  const addWeek = useCallback(() => {
    const newWeekNumber = study.weeks.length + 1;
    const newWeek: Week = {
      id: `new-week-${Date.now()}`,
      weekNumber: newWeekNumber,
      title: `Week ${newWeekNumber}`,
      description: "",
      days: [],
    };
    setStudy((prev) => ({ ...prev, weeks: [...prev.weeks, newWeek] }));
    setExpandedWeeks((prev) => [...prev, newWeek.id]);
  }, [study.weeks.length]);

  const updateWeek = useCallback((weekId: string, field: keyof Week, value: string) => {
    setStudy((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) =>
        w.id === weekId ? { ...w, [field]: value } : w
      ),
    }));
  }, []);

  const deleteWeek = useCallback((weekId: string) => {
    setStudy((prev) => ({
      ...prev,
      weeks: prev.weeks
        .filter((w) => w.id !== weekId)
        .map((w, i) => ({ ...w, weekNumber: i + 1 })),
    }));
  }, []);

  const moveWeek = useCallback((weekId: string, direction: "up" | "down") => {
    setStudy((prev) => {
      const weekIndex = prev.weeks.findIndex((w) => w.id === weekId);
      if (
        (direction === "up" && weekIndex === 0) ||
        (direction === "down" && weekIndex === prev.weeks.length - 1)
      ) {
        return prev;
      }
      const newWeeks = [...prev.weeks];
      const swapIndex = direction === "up" ? weekIndex - 1 : weekIndex + 1;
      [newWeeks[weekIndex], newWeeks[swapIndex]] = [newWeeks[swapIndex], newWeeks[weekIndex]];
      return {
        ...prev,
        weeks: newWeeks.map((w, i) => ({ ...w, weekNumber: i + 1 })),
      };
    });
  }, []);

  // Day operations
  const addDay = useCallback((weekId: string) => {
    setStudy((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) => {
        if (week.id !== weekId) return week;
        const newDayNumber = week.days.length + 1;
        return {
          ...week,
          days: [
            ...week.days,
            {
              id: `new-day-${Date.now()}`,
              dayNumber: newDayNumber,
              title: `Day ${newDayNumber}`,
              content: "",
              scripture: "",
              questions: [],
            },
          ],
        };
      }),
    }));
  }, []);

  const updateDay = useCallback((weekId: string, dayId: string, field: keyof Day, value: string) => {
    setStudy((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) => {
        if (week.id !== weekId) return week;
        return {
          ...week,
          days: week.days.map((day) =>
            day.id === dayId ? { ...day, [field]: value } : day
          ),
        };
      }),
    }));
  }, []);

  const deleteDay = useCallback((weekId: string, dayId: string) => {
    setStudy((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) => {
        if (week.id !== weekId) return week;
        return {
          ...week,
          days: week.days
            .filter((d) => d.id !== dayId)
            .map((d, i) => ({ ...d, dayNumber: i + 1 })),
        };
      }),
    }));
  }, []);

  // Question operations
  const addQuestion = useCallback((weekId: string, dayId: string) => {
    setStudy((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) => {
        if (week.id !== weekId) return week;
        return {
          ...week,
          days: week.days.map((day) => {
            if (day.id !== dayId) return day;
            const newOrder = day.questions.length + 1;
            return {
              ...day,
              questions: [
                ...day.questions,
                {
                  id: `new-question-${Date.now()}`,
                  questionText: "",
                  questionType: "text",
                  order: newOrder,
                },
              ],
            };
          }),
        };
      }),
    }));
  }, []);

  const updateQuestion = useCallback(
    (weekId: string, dayId: string, questionId: string, field: keyof Question, value: string | number) => {
      setStudy((prev) => ({
        ...prev,
        weeks: prev.weeks.map((week) => {
          if (week.id !== weekId) return week;
          return {
            ...week,
            days: week.days.map((day) => {
              if (day.id !== dayId) return day;
              return {
                ...day,
                questions: day.questions.map((q) =>
                  q.id === questionId ? { ...q, [field]: value } : q
                ),
              };
            }),
          };
        }),
      }));
    },
    []
  );

  const deleteQuestion = useCallback((weekId: string, dayId: string, questionId: string) => {
    setStudy((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) => {
        if (week.id !== weekId) return week;
        return {
          ...week,
          days: week.days.map((day) => {
            if (day.id !== dayId) return day;
            return {
              ...day,
              questions: day.questions
                .filter((q) => q.id !== questionId)
                .map((q, i) => ({ ...q, order: i + 1 })),
            };
          }),
        };
      }),
    }));
  }, []);

  const moveQuestion = useCallback(
    (weekId: string, dayId: string, questionId: string, direction: "up" | "down") => {
      setStudy((prev) => ({
        ...prev,
        weeks: prev.weeks.map((week) => {
          if (week.id !== weekId) return week;
          return {
            ...week,
            days: week.days.map((day) => {
              if (day.id !== dayId) return day;
              const qIndex = day.questions.findIndex((q) => q.id === questionId);
              if (
                (direction === "up" && qIndex === 0) ||
                (direction === "down" && qIndex === day.questions.length - 1)
              ) {
                return day;
              }
              const newQuestions = [...day.questions];
              const swapIndex = direction === "up" ? qIndex - 1 : qIndex + 1;
              [newQuestions[qIndex], newQuestions[swapIndex]] = [
                newQuestions[swapIndex],
                newQuestions[qIndex],
              ];
              return {
                ...day,
                questions: newQuestions.map((q, i) => ({ ...q, order: i + 1 })),
              };
            }),
          };
        }),
      }));
    },
    []
  );

  // Save all changes
  const handleSave = async () => {
    setSaveStatus("saving");

    try {
      const response = await fetch(`/api/admin/studies/${study.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...study,
          price: Math.round(study.price * 100), // Convert to cents
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save study");
      }

      setSaveStatus("saved");
      router.refresh();

      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Error saving study:", error);
      setSaveStatus("error");

      setTimeout(() => {
        setSaveStatus("idle");
      }, 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Status Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <span className="text-gray-600 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-green-600 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              All changes saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-red-600 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Error saving - please try again
            </span>
          )}
        </div>
        <Button onClick={handleSave} disabled={saveStatus === "saving"}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Changes
        </Button>
      </div>

      {/* Study Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Study Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={study.title}
                onChange={(e) => updateStudyField("title", e.target.value)}
                placeholder="Study title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={study.author}
                onChange={(e) => updateStudyField("author", e.target.value)}
                placeholder="Author name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <RichTextEditor
              content={study.description}
              onChange={(html) => updateStudyField("description", html)}
              placeholder="Enter study description..."
              minHeight="100px"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={study.price}
                onChange={(e) => updateStudyField("price", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                value={study.coverImage}
                onChange={(e) => updateStudyField("coverImage", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={study.isPublished}
                onCheckedChange={(checked) => updateStudyField("isPublished", checked)}
              />
              <Label htmlFor="published">Published</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="premium"
                checked={study.isPremium}
                onCheckedChange={(checked) => updateStudyField("isPremium", checked)}
              />
              <Label htmlFor="premium">Premium</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weeks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Weeks ({study.weeks.length})</CardTitle>
          <Button onClick={addWeek} variant="outline" size="sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Week
          </Button>
        </CardHeader>
        <CardContent>
          {study.weeks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No weeks yet. Click &quot;Add Week&quot; to get started.</p>
          ) : (
            <Accordion
              type="multiple"
              value={expandedWeeks}
              onValueChange={setExpandedWeeks}
              className="space-y-2"
            >
              {study.weeks.map((week, weekIndex) => (
                <AccordionItem key={week.id} value={week.id} className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="secondary">Week {week.weekNumber}</Badge>
                      <span className="font-medium">{week.title}</span>
                      <span className="text-sm text-gray-500">({week.days.length} days)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {/* Week controls */}
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveWeek(week.id, "up")}
                          disabled={weekIndex === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveWeek(week.id, "down")}
                          disabled={weekIndex === study.weeks.length - 1}
                        >
                          ↓
                        </Button>
                        <div className="flex-1" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600">
                              Delete Week
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Week {week.weekNumber}</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the week and all its days and questions. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteWeek(week.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {/* Week fields */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Week Title</Label>
                          <Input
                            value={week.title}
                            onChange={(e) => updateWeek(week.id, "title", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Week Description</Label>
                        <RichTextEditor
                          content={week.description}
                          onChange={(html) => updateWeek(week.id, "description", html)}
                          placeholder="Week description..."
                          minHeight="80px"
                        />
                      </div>

                      {/* Days */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-700">Days</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addDay(week.id)}
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Day
                          </Button>
                        </div>

                        {week.days.length === 0 ? (
                          <p className="text-gray-500 text-sm py-4">No days yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {week.days.map((day) => (
                              <div key={day.id} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <Badge>Day {day.dayNumber}</Badge>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-red-600 h-8">
                                        Delete
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Day {day.dayNumber}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will delete the day and all its questions.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteDay(week.id, day.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>

                                <div className="space-y-3">
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Title</Label>
                                      <Input
                                        value={day.title}
                                        onChange={(e) => updateDay(week.id, day.id, "title", e.target.value)}
                                        className="h-9"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Scripture Reference</Label>
                                      <Input
                                        value={day.scripture}
                                        onChange={(e) => updateDay(week.id, day.id, "scripture", e.target.value)}
                                        placeholder="e.g., 1 Timothy 1:1-7"
                                        className="h-9"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Content</Label>
                                    <RichTextEditor
                                      content={day.content}
                                      onChange={(html) => updateDay(week.id, day.id, "content", html)}
                                      placeholder="Day content..."
                                      minHeight="60px"
                                    />
                                  </div>

                                  {/* Questions */}
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-600">
                                        Questions ({day.questions.length})
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => addQuestion(week.id, day.id)}
                                        className="h-7 text-xs"
                                      >
                                        + Add Question
                                      </Button>
                                    </div>

                                    {day.questions.length > 0 && (
                                      <div className="space-y-2">
                                        {day.questions.map((question, qIndex) => (
                                          <div
                                            key={question.id}
                                            className="flex gap-2 items-start bg-white p-2 rounded border"
                                          >
                                            <div className="flex flex-col gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => moveQuestion(week.id, day.id, question.id, "up")}
                                                disabled={qIndex === 0}
                                              >
                                                ↑
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => moveQuestion(week.id, day.id, question.id, "down")}
                                                disabled={qIndex === day.questions.length - 1}
                                              >
                                                ↓
                                              </Button>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                              <RichTextEditor
                                                content={question.questionText}
                                                onChange={(html) =>
                                                  updateQuestion(week.id, day.id, question.id, "questionText", html)
                                                }
                                                placeholder="Question text..."
                                                minHeight="40px"
                                              />
                                              <Select
                                                value={question.questionType}
                                                onValueChange={(value) =>
                                                  updateQuestion(week.id, day.id, question.id, "questionType", value)
                                                }
                                              >
                                                <SelectTrigger className="w-40 h-8">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="text">Text Answer</SelectItem>
                                                  <SelectItem value="reflection">Reflection</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-red-600 h-8"
                                              onClick={() => deleteQuestion(week.id, day.id, question.id)}
                                            >
                                              ×
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

