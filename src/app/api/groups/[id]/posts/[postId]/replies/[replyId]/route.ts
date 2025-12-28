import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string; replyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: groupId, postId, replyId } = await params;

    // Fetch reply with post and group info
    const reply = await prisma.discussionReply.findUnique({
      where: { id: replyId },
      include: {
        post: {
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
        },
      },
    });

    if (!reply) {
      return NextResponse.json(
        { error: "Reply not found" },
        { status: 404 }
      );
    }

    // Verify reply belongs to the post and group
    if (reply.postId !== postId) {
      return NextResponse.json(
        { error: "Reply not found for this post" },
        { status: 404 }
      );
    }

    if (reply.post.groupId !== groupId) {
      return NextResponse.json(
        { error: "Reply not found in this group" },
        { status: 404 }
      );
    }

    // Check permissions: reply author, group owner, or moderator
    const isAuthor = reply.userId === session.user.id;
    const isOwner = reply.post.group.ownerId === session.user.id;
    const isModerator = reply.post.group.moderators.some((m) => m.userId === session.user.id);

    if (!isAuthor && !isOwner && !isModerator) {
      return NextResponse.json(
        { error: "You don't have permission to delete this reply" },
        { status: 403 }
      );
    }

    // Hard delete the reply
    await prisma.discussionReply.delete({
      where: { id: replyId },
    });

    return NextResponse.json(
      { message: "Reply deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete reply error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

