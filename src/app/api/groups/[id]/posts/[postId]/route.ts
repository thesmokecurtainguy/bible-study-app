import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper function to check if user is a member of the group
async function verifyGroupMembership(groupId: string, userId: string): Promise<boolean> {
  const membership = await prisma.groupMembership.findFirst({
    where: {
      groupId,
      userId,
      leftAt: null,
    },
  });
  return !!membership;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: groupId, postId } = await params;

    // Verify user is a member of the group
    const isMember = await verifyGroupMembership(groupId, session.user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: "You must be a member of this group to view posts" },
        { status: 403 }
      );
    }

    // Fetch post with replies
    const post = await prisma.discussionPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        replies: {
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
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Verify post belongs to this group
    if (post.groupId !== groupId) {
      return NextResponse.json(
        { error: "Post not found in this group" },
        { status: 404 }
      );
    }

    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    console.error("Fetch post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: groupId, postId } = await params;

    // Fetch post with group info
    const post = await prisma.discussionPost.findUnique({
      where: { id: postId },
      include: {
        group: {
          include: {
            moderators: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Verify post belongs to this group
    if (post.groupId !== groupId) {
      return NextResponse.json(
        { error: "Post not found in this group" },
        { status: 404 }
      );
    }

    // Check permissions: post author, group owner, or moderator
    const isAuthor = post.userId === session.user.id;
    const isOwner = post.group.ownerId === session.user.id;
    const isModerator = post.group.moderators.some((m) => m.userId === session.user.id);

    if (!isAuthor && !isOwner && !isModerator) {
      return NextResponse.json(
        { error: "You don't have permission to delete this post" },
        { status: 403 }
      );
    }

    // Hard delete the post (replies will be cascade deleted)
    await prisma.discussionPost.delete({
      where: { id: postId },
    });

    return NextResponse.json(
      { message: "Post deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

