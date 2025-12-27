import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendStudyReminder } from "@/lib/email/resend";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET environment variable is not set");
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find users who need reminders
    // - emailRemindersEnabled = true
    // - reminderTime is set
    // - Haven't received a reminder in the last 20 hours
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    const usersNeedingReminders = await prisma.profile.findMany({
      where: {
        emailRemindersEnabled: true,
        reminderTime: { not: null },
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lt: twentyHoursAgo } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const results = {
      checked: usersNeedingReminders.length,
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const profile of usersNeedingReminders) {
      try {
        // Parse reminder time (format: "HH:MM" in 24-hour format)
        if (!profile.reminderTime) {
          results.skipped++;
          continue;
        }

        // For daily cron: Send reminders to all eligible users
        // Note: With daily cron (Vercel Hobby plan), exact time matching isn't possible
        // Users will receive reminders once per day when cron runs (9 AM UTC)
        // To get exact time matching with hourly reminders, upgrade to Vercel Pro plan

        // Get user's most recent active study (purchased, not completed)
        const purchases = await prisma.purchase.findMany({
          where: {
            userId: profile.userId,
            status: "completed",
            // Check if access hasn't expired
            OR: [
              { accessExpiresAt: null },
              { accessExpiresAt: { gt: now } },
            ],
          },
          include: {
            study: {
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
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        });

        if (purchases.length === 0) {
          results.skipped++;
          continue;
        }

        const purchase = purchases[0];
        const study = purchase.study;

        // Calculate progress
        const allQuestionIds = study.weeks.flatMap((week) =>
          week.days.flatMap((day) => day.questions.map((q) => q.id))
        );

        const userAnswers = await prisma.answer.findMany({
          where: {
            userId: profile.userId,
            questionId: { in: allQuestionIds },
          },
        });

        const totalQuestions = allQuestionIds.length;
        const answeredQuestions = userAnswers.length;
        const progress = totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0;

        // Skip if study is completed (100%)
        if (progress >= 100) {
          results.skipped++;
          continue;
        }

        // Find current week and day
        // Find the first week/day that has unanswered questions
        let currentWeek = 1;
        let currentDay = 1;
        let foundCurrent = false;

        for (const week of study.weeks) {
          for (const day of week.days) {
            const dayQuestionIds = day.questions.map((q) => q.id);
            const dayAnswers = userAnswers.filter((a) =>
              dayQuestionIds.includes(a.questionId)
            );

            if (dayAnswers.length < dayQuestionIds.length) {
              currentWeek = week.weekNumber;
              currentDay = day.dayNumber;
              foundCurrent = true;
              break;
            }
          }
          if (foundCurrent) break;
        }

        // Generate unsubscribe URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
          process.env.NEXTAUTH_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
        
        // Create a secure unsubscribe token (using userId + secret)
        const secret = process.env.NEXTAUTH_SECRET || "fallback-secret";
        const tokenData = `${profile.userId}:${secret}`;
        const unsubscribeToken = crypto
          .createHash("sha256")
          .update(tokenData)
          .digest("hex");
        
        const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}&userId=${profile.userId}`;
        const studyUrl = `${baseUrl}/studies/${study.id}/start?week=${currentWeek}&day=${currentDay}`;

        // Send reminder email
        await sendStudyReminder({
          to: profile.user.email,
          userName: profile.user.name || profile.firstName || "Friend",
          studyTitle: study.title,
          progress,
          currentWeek,
          currentDay,
          studyUrl,
          unsubscribeUrl,
        });

        // Update lastReminderSentAt
        await prisma.profile.update({
          where: { id: profile.id },
          data: { lastReminderSentAt: now },
        });

        results.sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`User ${profile.userId}: ${errorMessage}`);
        console.error(`Error processing reminder for user ${profile.userId}:`, error);
        // Continue with next user instead of failing entire job
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error("Error in send-reminders cron job:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

