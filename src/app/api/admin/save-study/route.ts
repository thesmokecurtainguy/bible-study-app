import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParsedStudy } from "@/lib/claude";
import { validateParsedStudy, getStudyStats } from "@/lib/doc-parser";

// Helper to delete a study and all related records (for cleanup on failure)
async function deleteStudyWithRelations(studyId: string) {
  try {
    // Due to cascade delete set up in Prisma, we just need to delete the study
    await prisma.study.delete({
      where: { id: studyId },
    });
    console.log(`[cleanup] Deleted study ${studyId} and related records`);
  } catch (error) {
    console.error(`[cleanup] Failed to delete study ${studyId}:`, error);
  }
}

export async function POST(request: NextRequest) {
  let createdStudyId: string | null = null;

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

    // Parse request body
    const body = await request.json();
    const { study, isPublished = false, isPremium = false, price = 0 } = body as {
      study: ParsedStudy;
      isPublished?: boolean;
      isPremium?: boolean;
      price?: number;
    };

    if (!study) {
      return NextResponse.json(
        { error: "No study data provided" },
        { status: 400 }
      );
    }

    // Validate the parsed study
    const validation = validateParsedStudy(study);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Invalid study structure",
          validationErrors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Get stats before saving
    const stats = getStudyStats(study);
    console.log(`[save-study] Starting save: ${stats.totalWeeks} weeks, ${stats.totalDays} days, ${stats.totalQuestions} questions`);

    // Create the study first (outside transaction for better error handling)
    const createdStudy = await prisma.study.create({
      data: {
        title: study.title,
        description: study.description,
        author: study.author,
        isPublished,
        isPremium,
        price,
      },
    });
    createdStudyId = createdStudy.id;
    console.log(`[save-study] Created study: ${createdStudy.id}`);

    // Process weeks one at a time to avoid transaction timeout
    // Use smaller transactions per week for better reliability
    for (const week of study.weeks) {
      await prisma.$transaction(
        async (tx) => {
          // Create the week
          const createdWeek = await tx.week.create({
            data: {
              studyId: createdStudy.id,
              weekNumber: week.weekNumber,
              title: week.title,
              description: week.description,
            },
          });

          // Collect all days and questions for batch insert
          const daysData: Array<{
            weekId: string;
            dayNumber: number;
            title: string;
            content: string | null;
            scripture: string | null;
          }> = [];

          for (const day of week.days || []) {
            daysData.push({
              weekId: createdWeek.id,
              dayNumber: day.dayNumber,
              title: day.title,
              content: day.content,
              scripture: day.scripture,
            });
          }

          // Batch create all days for this week
          if (daysData.length > 0) {
            await tx.day.createMany({ data: daysData });
          }

          // Now get the created days to get their IDs
          const createdDays = await tx.day.findMany({
            where: { weekId: createdWeek.id },
            orderBy: { dayNumber: "asc" },
          });

          // Create a map of dayNumber to dayId
          const dayIdMap = new Map<number, string>();
          for (const day of createdDays) {
            dayIdMap.set(day.dayNumber, day.id);
          }

          // Collect all questions for batch insert
          const questionsData: Array<{
            dayId: string;
            questionText: string;
            questionType: string;
            order: number;
          }> = [];

          for (const day of week.days || []) {
            const dayId = dayIdMap.get(day.dayNumber);
            if (dayId && day.questions) {
              for (const q of day.questions) {
                questionsData.push({
                  dayId,
                  questionText: q.questionText,
                  questionType: q.questionType,
                  order: q.order,
                });
              }
            }
          }

          // Batch create all questions for this week
          if (questionsData.length > 0) {
            await tx.question.createMany({ data: questionsData });
          }

          console.log(`[save-study] Saved week ${week.weekNumber}: ${daysData.length} days, ${questionsData.length} questions`);
        },
        {
          timeout: 30000, // 30 second timeout per week
          maxWait: 10000, // Max wait for transaction slot
        }
      );
    }

    // Fetch the complete study with all relations
    const savedStudy = await prisma.study.findUnique({
      where: { id: createdStudy.id },
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "create",
        entityType: "Study",
        entityId: savedStudy?.id,
        details: {
          title: study.title,
          stats,
        },
      },
    });

    console.log(`[save-study] Complete! Study "${study.title}" saved successfully`);

    return NextResponse.json({
      success: true,
      study: savedStudy,
      stats,
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error("[save-study] Error:", error);

    // Clean up if we created a study but failed later
    if (createdStudyId) {
      console.log(`[save-study] Cleaning up partially created study: ${createdStudyId}`);
      await deleteStudyWithRelations(createdStudyId);
    }
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A study with this title may already exist, or there was a conflict with week/day numbers." },
        { status: 409 }
      );
    }

    // Handle transaction timeout
    if (error instanceof Error && error.message.includes("expired transaction")) {
      return NextResponse.json(
        { error: "Save operation timed out. The study may be too large. Please try again or contact support." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save study",
      },
      { status: 500 }
    );
  }
}

