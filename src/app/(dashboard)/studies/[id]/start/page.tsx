import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import QuestionAnswer from "@/components/study/question-answer";
import { FloatingPrayerButton } from "@/components/study/floating-prayer-button";
import { ScriptureContent } from "@/components/bible/scripture-content";

interface StudyWorkspacePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    week?: string;
    day?: string;
  }>;
}

export default async function StudyWorkspacePage({ params, searchParams }: StudyWorkspacePageProps) {
  const { id } = await params;
  const { week: weekParam, day: dayParam } = await searchParams;
  const session = await getServerSession(authOptions);

  // Authentication check
  if (!session) {
    redirect("/login");
  }

  // Fetch study with all related data
  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: {
              questions: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  // Check if study exists and is published
  if (!study || !study.isPublished) {
    notFound();
  }

  // Check if user has purchased this study
  const purchase = await prisma.purchase.findFirst({
    where: {
      userId: session.user.id,
      studyId: study.id,
      status: "completed",
    },
  });

  // If not purchased, redirect to purchase page
  if (!purchase) {
    redirect(`/studies/${id}`);
  }

  // Collect all question IDs for this study
  const allQuestionIds = study.weeks.flatMap((week) =>
    week.days.flatMap((day) => day.questions.map((q) => q.id))
  );

  // Fetch user's existing answers for this study
  const userAnswers = await prisma.answer.findMany({
    where: {
      userId: session.user.id,
      questionId: { in: allQuestionIds },
    },
  });

  // Create a map of questionId -> answer for quick lookup
  const answersMap = new Map(
    userAnswers.map((answer) => [answer.questionId, answer])
  );

  // Calculate total questions (excluding reflections) and answered questions
  const totalQuestions = allQuestionIds.length;
  const answeredQuestions = userAnswers.length;
  const progressPercentage = totalQuestions > 0 
    ? Math.round((answeredQuestions / totalQuestions) * 100) 
    : 0;

  // Parse current week and day from URL params (default to 1, 1)
  const currentWeekNumber = parseInt(weekParam || "1", 10) || 1;
  const currentDayNumber = parseInt(dayParam || "1", 10) || 1;

  // Find the current week and day
  const currentWeek = study.weeks.find((w) => w.weekNumber === currentWeekNumber);
  const currentDay = currentWeek?.days.find((d) => d.dayNumber === currentDayNumber);

  // If week/day not found, redirect to first available
  if (!currentWeek || !currentDay) {
    const firstWeek = study.weeks[0];
    const firstDay = firstWeek?.days[0];
    if (firstWeek && firstDay) {
      redirect(`/studies/${id}/start?week=${firstWeek.weekNumber}&day=${firstDay.dayNumber}`);
    } else {
      notFound();
    }
  }

  // Calculate which days are completed (all questions answered)
  const getDayCompletionStatus = (dayId: string, questions: typeof currentDay.questions) => {
    if (questions.length === 0) return true;
    return questions.every((q) => answersMap.has(q.id));
  };

  // Navigation helpers
  const findPreviousDay = () => {
    const currentWeekIndex = study.weeks.findIndex((w) => w.weekNumber === currentWeekNumber);
    const currentDayIndex = currentWeek!.days.findIndex((d) => d.dayNumber === currentDayNumber);

    if (currentDayIndex > 0) {
      const prevDay = currentWeek!.days[currentDayIndex - 1];
      return { week: currentWeekNumber, day: prevDay.dayNumber };
    } else if (currentWeekIndex > 0) {
      const prevWeek = study.weeks[currentWeekIndex - 1];
      const lastDay = prevWeek.days[prevWeek.days.length - 1];
      if (lastDay) {
        return { week: prevWeek.weekNumber, day: lastDay.dayNumber };
      }
    }
    return null;
  };

  const findNextDay = () => {
    const currentWeekIndex = study.weeks.findIndex((w) => w.weekNumber === currentWeekNumber);
    const currentDayIndex = currentWeek!.days.findIndex((d) => d.dayNumber === currentDayNumber);

    if (currentDayIndex < currentWeek!.days.length - 1) {
      const nextDay = currentWeek!.days[currentDayIndex + 1];
      return { week: currentWeekNumber, day: nextDay.dayNumber };
    } else if (currentWeekIndex < study.weeks.length - 1) {
      const nextWeek = study.weeks[currentWeekIndex + 1];
      const firstDay = nextWeek.days[0];
      if (firstDay) {
        return { week: nextWeek.weekNumber, day: firstDay.dayNumber };
      }
    }
    return null;
  };

  const previousDay = findPreviousDay();
  const nextDay = findNextDay();

  // Fetch user's groups for this study
  const userGroups = await prisma.groupMembership.findMany({
    where: {
      userId: session.user.id,
      leftAt: null,
      group: {
        studyId: id,
        isActive: true,
      },
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: {
              memberships: {
                where: {
                  leftAt: null,
                },
              },
            },
          },
        },
      },
    },
  });

  // Use the first group if user is in any groups (for prayer requests)
  const groupId = userGroups.length > 0 ? userGroups[0].group.id : undefined;

  return (
    <div className="flex flex-col lg:flex-row gap-6 -mx-4 sm:-mx-6 lg:-mx-8 -my-8 min-h-[calc(100vh-4rem)] relative">
      {/* Left Sidebar - Week/Day Navigation */}
      <aside className="lg:w-72 xl:w-80 bg-white border-r border-gray-200 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 shrink-0">
        <div className="p-4 border-b border-gray-200">
          <Link
            href={`/studies/${id}`}
            className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Study
          </Link>
          <h2 className="mt-3 font-semibold text-gray-900 line-clamp-2">{study.title}</h2>
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]">
          <nav className="p-4 space-y-4">
            {study.weeks.map((week) => (
              <div key={week.id} className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                  Week {week.weekNumber}
                </h3>
                <p className="text-sm font-medium text-gray-700 px-2 mb-2">{week.title}</p>
                <div className="space-y-0.5">
                  {week.days.map((day) => {
                    const isCurrentDay = week.weekNumber === currentWeekNumber && day.dayNumber === currentDayNumber;
                    const isCompleted = getDayCompletionStatus(day.id, day.questions);
                    
                    return (
                      <Link
                        key={day.id}
                        href={`/studies/${id}/start?week=${week.weekNumber}&day=${day.dayNumber}`}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                          ${isCurrentDay 
                            ? "bg-blue-50 text-blue-700 font-medium border border-blue-200" 
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }
                        `}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${isCurrentDay ? "border-blue-400" : "border-gray-300"}`} />
                        )}
                        <span className="truncate">Day {day.dayNumber}: {day.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Study Groups Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Study Groups</h3>
            <Link href={`/groups/create?studyId=${id}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Create
              </Button>
            </Link>
          </div>
          {userGroups.length === 0 ? (
            <div className="text-sm text-gray-500 mb-2">
              <p className="mb-2">No groups yet for this study.</p>
              <Link href={`/groups/create?studyId=${id}`}>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Create Group
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {userGroups.map((membership) => (
                <Link
                  key={membership.group.id}
                  href={`/groups/${membership.group.id}`}
                  className="block p-2 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {membership.group.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {membership.group._count.memberships} {membership.group._count.memberships === 1 ? "member" : "members"}
                  </p>
                </Link>
              ))}
              <Link href={`/groups/create?studyId=${id}`}>
                <Button variant="outline" size="sm" className="w-full text-xs mt-2">
                  + Create New Group
                </Button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 bg-gray-50">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Week {currentWeekNumber}</span>
            <span>·</span>
            <span>Day {currentDayNumber}</span>
            {currentDay.questions.length > 0 && (
              <>
                <span>·</span>
                <span>{currentDay.questions.filter(q => answersMap.has(q.id)).length} / {currentDay.questions.length} completed</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {currentDay.title}
          </h1>
          {currentDay.scripture && (
            <div className="text-lg text-blue-700 italic font-serif">
              <ScriptureContent htmlContent={currentDay.scripture} />
            </div>
          )}
        </div>

        {/* Day Content */}
        {currentDay.content && (
          <Card className="mb-8 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-6">
              <div className="prose prose-amber max-w-none">
                <ScriptureContent
                  htmlContent={currentDay.content}
                  className="text-gray-700 whitespace-pre-wrap leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {currentDay.questions.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No questions for this day</h3>
                <p className="text-gray-500">Take time to reflect on the content and scripture above.</p>
              </CardContent>
            </Card>
          ) : (
            currentDay.questions.map((question, index) => {
              const existingAnswer = answersMap.get(question.id);

              return (
                <QuestionAnswer
                  key={question.id}
                  question={{
                    id: question.id,
                    questionText: question.questionText,
                    questionType: question.questionType,
                    order: question.order,
                  }}
                  existingAnswer={existingAnswer ? {
                    id: existingAnswer.id,
                    answerText: existingAnswer.answerText,
                    updatedAt: existingAnswer.updatedAt,
                  } : null}
                  questionIndex={index}
                />
              );
            })
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-10 flex items-center justify-between pt-6 border-t border-gray-200">
          {previousDay ? (
            <Link href={`/studies/${id}/start?week=${previousDay.week}&day=${previousDay.day}`}>
              <Button variant="outline" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Day
              </Button>
            </Link>
          ) : (
            <div />
          )}

          {nextDay ? (
            <Link href={`/studies/${id}/start?week=${nextDay.week}&day=${nextDay.day}`}>
              <Button className="gap-2">
                Next Day
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                Study Complete!
              </Badge>
              <Link href="/studies">
                <Button variant="outline">Back to Studies</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Navigation Hint */}
        <p className="mt-6 text-center text-sm text-gray-500 lg:hidden">
          Scroll up to access the week and day navigation
        </p>
      </main>

      {/* Floating Prayer Button */}
      <FloatingPrayerButton
        studyId={id}
        groupId={groupId}
        userId={session.user.id}
      />
    </div>
  );
}

