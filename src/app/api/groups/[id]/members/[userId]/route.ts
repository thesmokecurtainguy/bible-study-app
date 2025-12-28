import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: groupId, userId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get group with moderators
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        moderators: {
          select: {
            userId: true,
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

    // Check if user is owner or moderator
    const isOwner = group.ownerId === session.user.id;
    const isModerator = group.moderators.some((m) => m.userId === session.user.id);

    if (!isOwner && !isModerator) {
      return NextResponse.json(
        { error: "You must be the owner or a moderator to remove members" },
        { status: 403 }
      );
    }

    // Cannot remove the owner
    if (userId === group.ownerId) {
      return NextResponse.json(
        { error: "Cannot remove the group owner" },
        { status: 400 }
      );
    }

    // Find membership
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership || membership.leftAt) {
      return NextResponse.json(
        { error: "User is not a member of this group" },
        { status: 404 }
      );
    }

    // Soft delete membership (set leftAt)
    await prisma.groupMembership.update({
      where: {
        id: membership.id,
      },
      data: {
        leftAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Member removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

