import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const answerSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  answerText: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = answerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { questionId, answerText } = validationResult.data;

    // Verify the question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        day: {
          include: {
            week: {
              include: {
                study: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Verify user has purchased the study
    const studyId = question.day.week.study.id;
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId: session.user.id,
        studyId,
        status: "completed",
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "You must purchase this study to submit answers" },
        { status: 403 }
      );
    }

    // Upsert the answer (create or update)
    const answer = await prisma.answer.upsert({
      where: {
        questionId_userId: {
          questionId,
          userId: session.user.id,
        },
      },
      update: {
        answerText,
      },
      create: {
        questionId,
        userId: session.user.id,
        answerText,
      },
    });

    return NextResponse.json({
      success: true,
      answer: {
        id: answer.id,
        questionId: answer.questionId,
        answerText: answer.answerText,
        updatedAt: answer.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error saving answer:", error);
    return NextResponse.json(
      { error: "Failed to save answer" },
      { status: 500 }
    );
  }
}

