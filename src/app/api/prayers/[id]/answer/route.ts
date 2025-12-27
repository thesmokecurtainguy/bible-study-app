import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const answerPrayerSchema = z.object({
  answeredNote: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = session.user.id;

    const prayer = await prisma.prayerRequest.findUnique({
      where: { id },
    });

    if (!prayer) {
      return NextResponse.json(
        { error: "Prayer request not found" },
        { status: 404 }
      );
    }

    // Only owner can mark as answered
    if (prayer.userId !== userId) {
      return NextResponse.json(
        { error: "Only the owner can mark this prayer as answered" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = answerPrayerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { answeredNote } = validationResult.data;

    const updatedPrayer = await prisma.prayerRequest.update({
      where: { id },
      data: {
        isAnswered: true,
        answeredAt: new Date(),
        answeredNote: answeredNote || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        study: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({ prayer: updatedPrayer }, { status: 200 });
  } catch (error) {
    console.error("Prayer answer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

