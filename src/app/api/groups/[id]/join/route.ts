import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const joinGroupSchema = z.object({
  inviteCode: z.string().length(8, "Invite code must be 8 characters"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = joinGroupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { inviteCode } = validationResult.data;

    // Get group
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        study: {
          select: {
            id: true,
            title: true,
          },
        },
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
    });

    if (!group || !group.isActive) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Check invite code matches
    if (group.inviteCode !== inviteCode) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 400 }
      );
    }

    // Check if invites are enabled
    if (!group.inviteEnabled) {
      return NextResponse.json(
        { error: "Invites are currently disabled for this group" },
        { status: 403 }
      );
    }

    // Check if user has purchased the study
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId: session.user.id,
        studyId: group.studyId,
        status: "completed",
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "You must purchase this study before joining the group" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: session.user.id,
        },
      },
    });

    if (existingMembership && !existingMembership.leftAt) {
      return NextResponse.json(
        { error: "You are already a member of this group" },
        { status: 400 }
      );
    }

    // Check max members limit
    if (group.maxMembers && group._count.memberships >= group.maxMembers) {
      return NextResponse.json(
        { error: "This group has reached its maximum member limit" },
        { status: 403 }
      );
    }

    // Create or reactivate membership
    if (existingMembership) {
      // Reactivate existing membership
      await prisma.groupMembership.update({
        where: {
          id: existingMembership.id,
        },
        data: {
          leftAt: null,
        },
      });
    } else {
      // Create new membership
      await prisma.groupMembership.create({
        data: {
          groupId: id,
          userId: session.user.id,
          role: "member",
        },
      });
    }

    return NextResponse.json(
      {
        message: "Successfully joined the group",
        group: {
          id: group.id,
          name: group.name,
          studyTitle: group.study.title,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Join group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

