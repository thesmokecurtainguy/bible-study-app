import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePrayerSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long").optional(),
  content: z.string().min(1, "Content is required").optional(),
  isAnswered: z.boolean().optional(),
  answeredNote: z.string().optional().nullable(),
});

export async function GET(
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

    if (!prayer) {
      return NextResponse.json(
        { error: "Prayer request not found" },
        { status: 404 }
      );
    }

    // Check access: owner OR group member
    const isOwner = prayer.userId === userId;
    const isGroupMember = prayer.groupId
      ? await prisma.groupMembership.findFirst({
          where: {
            groupId: prayer.groupId,
            userId,
            leftAt: null,
          },
        })
      : false;

    // CRITICAL: Private prayers can ONLY be accessed by owner
    if (!prayer.groupId && !isOwner) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Group prayers can be accessed by owner or group members
    if (prayer.groupId && !isOwner && !isGroupMember) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ prayer }, { status: 200 });
  } catch (error) {
    console.error("Prayer fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Only owner can update
    if (prayer.userId !== userId) {
      return NextResponse.json(
        { error: "Only the owner can update this prayer request" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updatePrayerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (validationResult.data.title !== undefined) {
      updateData.title = validationResult.data.title;
    }
    if (validationResult.data.content !== undefined) {
      updateData.content = validationResult.data.content;
    }
    if (validationResult.data.isAnswered !== undefined) {
      updateData.isAnswered = validationResult.data.isAnswered;
      if (validationResult.data.isAnswered && !prayer.answeredAt) {
        updateData.answeredAt = new Date();
      } else if (!validationResult.data.isAnswered) {
        updateData.answeredAt = null;
        updateData.answeredNote = null;
      }
    }
    if (validationResult.data.answeredNote !== undefined) {
      updateData.answeredNote = validationResult.data.answeredNote;
    }

    const updatedPrayer = await prisma.prayerRequest.update({
      where: { id },
      data: updateData,
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
    console.error("Prayer update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Only owner can delete
    if (prayer.userId !== userId) {
      return NextResponse.json(
        { error: "Only the owner can delete this prayer request" },
        { status: 403 }
      );
    }

    await prisma.prayerRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Prayer deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

