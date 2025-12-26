import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import PurchaseButton from "@/components/purchase-button";
import StudyWeeksAccordion from "./study-weeks-accordion";

interface StudyDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StudyDetailPage({ params }: StudyDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get study details with weeks, days, and question counts
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
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!study || !study.isPublished) {
    notFound();
  }

  // Check if user owns this study
  const purchase = await prisma.purchase.findFirst({
    where: {
      userId: session.user.id,
      studyId: study.id,
      status: "completed",
    },
  });

  const isOwned = !!purchase;

  // Calculate progress if owned
  let progressPercentage = 0;
  let answeredQuestions = 0;
  let totalQuestions = 0;
  let answeredQuestionIds: Set<string> = new Set();

  if (isOwned) {
    // Get all question IDs
    const allQuestionIds = study.weeks.flatMap((week) =>
      week.days.flatMap((day) => day.questions.map((q) => q.id))
    );
    totalQuestions = allQuestionIds.length;

    // Get user's answers
    const userAnswers = await prisma.answer.findMany({
      where: {
        userId: session.user.id,
        questionId: { in: allQuestionIds },
      },
      select: { questionId: true },
    });

    answeredQuestions = userAnswers.length;
    answeredQuestionIds = new Set(userAnswers.map((a) => a.questionId));
    progressPercentage = totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;
  }

  // Price is stored in cents, convert to dollars for display
  const priceInCents = study.price ? Number(study.price) : 0;
  const priceInDollars = priceInCents / 100;

  // Calculate stats for each week
  const weeksWithStats = study.weeks.map((week) => {
    const totalDays = week.days.length;
    const totalQuestionsInWeek = week.days.reduce((sum, day) => sum + day.questions.length, 0);
    
    // Calculate completed days (all questions answered)
    const completedDays = isOwned
      ? week.days.filter((day) =>
          day.questions.length === 0 || day.questions.every((q) => answeredQuestionIds.has(q.id))
        ).length
      : 0;

    return {
      ...week,
      totalDays,
      totalQuestionsInWeek,
      completedDays,
      days: week.days.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        title: day.title,
        questionCount: day.questions.length,
        isCompleted: isOwned && (day.questions.length === 0 || day.questions.every((q) => answeredQuestionIds.has(q.id))),
      })),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/studies"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          ← Back to Studies
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {study.coverImage && (
            <div className="mb-6 h-64 w-full overflow-hidden rounded-lg">
              <img
                src={study.coverImage}
                alt={study.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{study.title}</CardTitle>
                  {study.author && (
                    <p className="mt-1 text-sm text-gray-500">
                      By {study.author}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOwned && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Owned
                    </Badge>
                  )}
                  {study.isPremium && (
                    <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                      Premium
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="whitespace-pre-wrap text-base">
                {study.description || "No description available."}
              </CardDescription>

              {weeksWithStats.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Study Structure</h3>
                    <span className="text-sm text-gray-500">
                      {weeksWithStats.length} weeks · {weeksWithStats.reduce((sum, w) => sum + w.totalDays, 0)} days
                    </span>
                  </div>
                  
                  <StudyWeeksAccordion 
                    weeks={weeksWithStats} 
                    studyId={study.id} 
                    isOwned={isOwned}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>
                {isOwned ? "Your Study" : "Get This Study"}
              </CardTitle>
              <CardDescription>
                {isOwned
                  ? "Continue where you left off"
                  : priceInDollars > 0
                  ? "Get lifetime access to this study"
                  : "This study is free"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOwned ? (
                <>
                  {/* Progress Section for Owners */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Your Progress</span>
                      <span className="font-medium text-gray-900">{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <p className="text-xs text-gray-500">
                      {answeredQuestions} of {totalQuestions} questions completed
                    </p>
                  </div>

                  <Link href={`/studies/${study.id}/start`} className="block">
                    <Button className="w-full" size="lg">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Continue Study
                    </Button>
                  </Link>

                  <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium">You own this study</p>
                        <p className="mt-1 text-green-600">Lifetime access included</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Price Display for Non-Owners */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {priceInDollars > 0 ? `$${priceInDollars.toFixed(2)}` : "Free"}
                    </div>
                    {priceInDollars > 0 && (
                      <p className="mt-1 text-sm text-gray-500">
                        One-time payment
                      </p>
                    )}
                  </div>

                  <PurchaseButton studyId={study.id} price={priceInDollars} />

                  {priceInDollars > 0 && (
                    <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <svg
                            className="mr-2 h-5 w-5 text-green-500 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Lifetime access
                        </li>
                        <li className="flex items-start">
                          <svg
                            className="mr-2 h-5 w-5 text-green-500 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          All study materials included
                        </li>
                        <li className="flex items-start">
                          <svg
                            className="mr-2 h-5 w-5 text-green-500 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Secure payment via Stripe
                        </li>
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
