import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createReplySchema = z.object({
  content: z.string().min(1, "Content is required"),
});

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

export async function POST(
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

    // Fetch post to verify it exists and belongs to the group
    const post = await prisma.discussionPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        groupId: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (post.groupId !== groupId) {
      return NextResponse.json(
        { error: "Post not found in this group" },
        { status: 404 }
      );
    }

    // Verify user is a member of the group
    const isMember = await verifyGroupMembership(groupId, session.user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: "You must be a member of this group to reply" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createReplySchema.safeParse(body);

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

    const { content } = validationResult.data;

    // Create reply
    const reply = await prisma.discussionReply.create({
      data: {
        postId,
        userId: session.user.id,
        content: content.trim(),
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
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error("Create reply error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

