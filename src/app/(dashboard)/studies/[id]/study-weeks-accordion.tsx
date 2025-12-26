"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Day {
  id: string;
  dayNumber: number;
  title: string;
  questionCount: number;
  isCompleted: boolean;
}

interface Week {
  id: string;
  weekNumber: number;
  title: string;
  description: string | null;
  totalDays: number;
  totalQuestionsInWeek: number;
  completedDays: number;
  days: Day[];
}

interface StudyWeeksAccordionProps {
  weeks: Week[];
  studyId: string;
  isOwned: boolean;
}

export default function StudyWeeksAccordion({ weeks, studyId, isOwned }: StudyWeeksAccordionProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        next.add(weekId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedWeeks(new Set(weeks.map((w) => w.id)));
  };

  const collapseAll = () => {
    setExpandedWeeks(new Set());
  };

  return (
    <div className="space-y-3">
      {/* Expand/Collapse All Controls */}
      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={expandAll}
          className="text-xs text-blue-600 hover:text-blue-500"
        >
          Expand all
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={collapseAll}
          className="text-xs text-blue-600 hover:text-blue-500"
        >
          Collapse all
        </button>
      </div>

      {weeks.map((week) => {
        const isExpanded = expandedWeeks.has(week.id);
        const isWeekComplete = isOwned && week.completedDays === week.totalDays && week.totalDays > 0;

        return (
          <div
            key={week.id}
            className="rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Week Header */}
            <button
              onClick={() => toggleWeek(week.id)}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Expand/Collapse Icon */}
                <svg
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>

                {/* Completion Status */}
                {isOwned && (
                  isWeekComplete ? (
                    <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                  )
                )}

                <div className="min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    Week {week.weekNumber}: {week.title}
                  </h4>
                  {week.description && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {week.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Stats */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{week.totalDays} days</span>
                  <span className="text-gray-300">·</span>
                  <span>{week.totalQuestionsInWeek} questions</span>
                </div>

                {/* Progress Badge for Owners */}
                {isOwned && week.totalDays > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      isWeekComplete 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {week.completedDays}/{week.totalDays}
                  </Badge>
                )}
              </div>
            </button>

            {/* Days List (Expanded) */}
            {isExpanded && week.days.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50/50">
                {week.days.map((day, index) => (
                  <div
                    key={day.id}
                    className={`${index > 0 ? "border-t border-gray-100" : ""}`}
                  >
                    {isOwned ? (
                      <Link
                        href={`/studies/${studyId}/start?week=${week.weekNumber}&day=${day.dayNumber}`}
                        className="flex items-center justify-between p-3 pl-14 hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {day.isCompleted ? (
                            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                          )}
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                            Day {day.dayNumber}: {day.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-500">
                            {day.questionCount} {day.questionCount === 1 ? "question" : "questions"}
                          </span>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between p-3 pl-14 opacity-60">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                          <span className="text-sm text-gray-600 truncate">
                            Day {day.dayNumber}: {day.title}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">
                          {day.questionCount} {day.questionCount === 1 ? "question" : "questions"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {isExpanded && week.days.length === 0 && (
              <div className="border-t border-gray-200 p-4 pl-14 text-sm text-gray-500 italic">
                No days in this week yet
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

