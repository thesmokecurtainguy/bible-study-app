import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParsedStudy } from "@/lib/claude";
import { validateParsedStudy, getStudyStats } from "@/lib/doc-parser";

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

    // Create the study and all related records in a transaction
    const savedStudy = await prisma.$transaction(async (tx) => {
      // Create the main study record
      const createdStudy = await tx.study.create({
        data: {
          title: study.title,
          description: study.description,
          author: study.author,
          isPublished,
          isPremium,
          price,
        },
      });

      // Create weeks with days and questions
      for (const week of study.weeks) {
        const createdWeek = await tx.week.create({
          data: {
            studyId: createdStudy.id,
            weekNumber: week.weekNumber,
            title: week.title,
            description: week.description,
          },
        });

        // Create days within the week
        for (const day of week.days) {
          const createdDay = await tx.day.create({
            data: {
              weekId: createdWeek.id,
              dayNumber: day.dayNumber,
              title: day.title,
              content: day.content,
              scripture: day.scripture,
            },
          });

          // Create questions within the day
          if (day.questions && day.questions.length > 0) {
            await tx.question.createMany({
              data: day.questions.map((q) => ({
                dayId: createdDay.id,
                questionText: q.questionText,
                questionType: q.questionType,
                order: q.order,
              })),
            });
          }
        }
      }

      // Return the created study with full relations
      return tx.study.findUnique({
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

    return NextResponse.json({
      success: true,
      study: savedStudy,
      stats,
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error("Error saving study:", error);
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A study with this title may already exist, or there was a conflict with week/day numbers." },
        { status: 409 }
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

