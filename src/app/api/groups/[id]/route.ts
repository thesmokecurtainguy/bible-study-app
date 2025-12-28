import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name must be less than 100 characters").optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  inviteEnabled: z.boolean().optional(),
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

    // Get group with members and recent posts
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        study: {
          select: {
            id: true,
            title: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        memberships: {
          where: {
            leftAt: null,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
        moderators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        posts: {
          take: 10,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                replies: true,
              },
            },
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

    // Check if user is a member
    const isMember = group.memberships.some((m) => m.userId === session.user.id);
    const isOwner = group.ownerId === session.user.id;
    const isModerator = group.moderators.some((m) => m.userId === session.user.id);

    if (!isMember && !isOwner && !isModerator) {
      return NextResponse.json(
        { error: "You must be a member of this group to view it" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        studyId: group.studyId,
        studyTitle: group.study.title,
        ownerId: group.ownerId,
        ownerName: group.owner.name || group.owner.email,
        inviteCode: group.inviteCode,
        inviteEnabled: group.inviteEnabled,
        memberCount: group._count.memberships,
        members: group.memberships.map((m) => ({
          id: m.id,
          userId: m.userId,
          userName: m.user.name || m.user.email,
          userEmail: m.user.email,
          userImage: m.user.image,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        moderators: group.moderators.map((m) => ({
          id: m.id,
          userId: m.userId,
          userName: m.user.name || m.user.email,
        })),
        recentPosts: group.posts.map((p) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          userId: p.userId,
          userName: p.user.name || p.user.email,
          createdAt: p.createdAt,
          replyCount: p._count.replies,
        })),
        isOwner,
        isModerator,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
    });
  } catch (error) {
    console.error("Group fetch error:", error);
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

    const group = await prisma.group.findUnique({
      where: { id },
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
        { error: "You must be the owner or a moderator to update this group" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateGroupSchema.safeParse(body);

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

    const updateData: any = {};
    if (validationResult.data.name !== undefined) {
      updateData.name = validationResult.data.name;
    }
    if (validationResult.data.description !== undefined) {
      updateData.description = validationResult.data.description || null;
    }
    if (validationResult.data.inviteEnabled !== undefined) {
      updateData.inviteEnabled = validationResult.data.inviteEnabled;
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      group: {
        id: updatedGroup.id,
        name: updatedGroup.name,
        description: updatedGroup.description,
        studyId: updatedGroup.studyId,
        studyTitle: updatedGroup.study.title,
        inviteCode: updatedGroup.inviteCode,
        inviteEnabled: updatedGroup.inviteEnabled,
        memberCount: updatedGroup._count.memberships,
        updatedAt: updatedGroup.updatedAt,
      },
    });
  } catch (error) {
    console.error("Group update error:", error);
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

    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group || !group.isActive) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Check if user is owner
    if (group.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the group owner can delete the group" },
        { status: 403 }
      );
    }

    // Soft delete (set isActive = false)
    await prisma.group.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json(
      { message: "Group deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Group deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

