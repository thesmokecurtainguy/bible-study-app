import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to check admin access
async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }
  if (session.user.role !== "admin") {
    return { error: "Forbidden - Admin access required", status: 403 };
  }
  return { session };
}

// GET - Fetch full study with all nested data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authCheck = await checkAdminAccess();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
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

    if (!study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    return NextResponse.json(study);
  } catch (error) {
    console.error("Error fetching study:", error);
    return NextResponse.json({ error: "Failed to fetch study" }, { status: 500 });
  }
}

// PUT - Update study with all nested content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authCheck = await checkAdminAccess();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const { title, description, author, coverImage, price, isPublished, isPremium, weeks } = body;

    // Update study metadata
    const updatedStudy = await prisma.study.update({
      where: { id },
      data: {
        title,
        description: description || null,
        author: author || null,
        coverImage: coverImage || null,
        price: price || 0,
        isPublished: isPublished ?? false,
        isPremium: isPremium ?? false,
      },
    });

    // If weeks are provided, sync them
    if (weeks && Array.isArray(weeks)) {
      // Get existing weeks
      const existingWeeks = await prisma.week.findMany({
        where: { studyId: id },
        include: {
          days: {
            include: {
              questions: true,
            },
          },
        },
      });

      const existingWeekIds = new Set(existingWeeks.map((w) => w.id));
      const newWeekIds = new Set(weeks.filter((w: { id: string }) => !w.id.startsWith("new-")).map((w: { id: string }) => w.id));

      // Delete weeks that are no longer present
      const weeksToDelete = existingWeeks.filter((w) => !newWeekIds.has(w.id));
      for (const week of weeksToDelete) {
        await prisma.week.delete({ where: { id: week.id } });
      }

      // Process each week
      for (const week of weeks) {
        const isNewWeek = week.id.startsWith("new-");

        let weekRecord;
        if (isNewWeek) {
          // Create new week
          weekRecord = await prisma.week.create({
            data: {
              studyId: id,
              weekNumber: week.weekNumber,
              title: week.title,
              description: week.description || null,
            },
          });
        } else {
          // Update existing week
          weekRecord = await prisma.week.update({
            where: { id: week.id },
            data: {
              weekNumber: week.weekNumber,
              title: week.title,
              description: week.description || null,
            },
          });
        }

        // Process days for this week
        if (week.days && Array.isArray(week.days)) {
          const existingDays = await prisma.day.findMany({
            where: { weekId: weekRecord.id },
            include: { questions: true },
          });
          const existingDayIds = new Set(existingDays.map((d) => d.id));
          const newDayIds = new Set(
            week.days.filter((d: { id: string }) => !d.id.startsWith("new-")).map((d: { id: string }) => d.id)
          );

          // Delete days that are no longer present
          const daysToDelete = existingDays.filter((d) => !newDayIds.has(d.id));
          for (const day of daysToDelete) {
            await prisma.day.delete({ where: { id: day.id } });
          }

          // Process each day
          for (const day of week.days) {
            const isNewDay = day.id.startsWith("new-");

            let dayRecord;
            if (isNewDay) {
              dayRecord = await prisma.day.create({
                data: {
                  weekId: weekRecord.id,
                  dayNumber: day.dayNumber,
                  title: day.title,
                  content: day.content || null,
                  scripture: day.scripture || null,
                },
              });
            } else {
              dayRecord = await prisma.day.update({
                where: { id: day.id },
                data: {
                  dayNumber: day.dayNumber,
                  title: day.title,
                  content: day.content || null,
                  scripture: day.scripture || null,
                },
              });
            }

            // Process questions for this day
            if (day.questions && Array.isArray(day.questions)) {
              const existingQuestions = await prisma.question.findMany({
                where: { dayId: dayRecord.id },
              });
              const existingQuestionIds = new Set(existingQuestions.map((q) => q.id));
              const newQuestionIds = new Set(
                day.questions.filter((q: { id: string }) => !q.id.startsWith("new-")).map((q: { id: string }) => q.id)
              );

              // Delete questions that are no longer present
              const questionsToDelete = existingQuestions.filter((q) => !newQuestionIds.has(q.id));
              for (const question of questionsToDelete) {
                await prisma.question.delete({ where: { id: question.id } });
              }

              // Process each question
              for (const question of day.questions) {
                const isNewQuestion = question.id.startsWith("new-");

                if (isNewQuestion) {
                  await prisma.question.create({
                    data: {
                      dayId: dayRecord.id,
                      questionText: question.questionText,
                      questionType: question.questionType,
                      order: question.order,
                    },
                  });
                } else {
                  await prisma.question.update({
                    where: { id: question.id },
                    data: {
                      questionText: question.questionText,
                      questionType: question.questionType,
                      order: question.order,
                    },
                  });
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, study: updatedStudy });
  } catch (error) {
    console.error("Error updating study:", error);
    return NextResponse.json({ error: "Failed to update study" }, { status: 500 });
  }
}

// DELETE - Delete study and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authCheck = await checkAdminAccess();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    // Delete study (cascades to weeks, days, questions, answers due to onDelete: Cascade)
    await prisma.study.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting study:", error);
    return NextResponse.json({ error: "Failed to delete study" }, { status: 500 });
  }
}

