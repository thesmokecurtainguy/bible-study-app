import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
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

    const { id: groupId } = await params;

    // Verify user is a member of the group
    const isMember = await verifyGroupMembership(groupId, session.user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: "You must be a member of this group to view posts" },
        { status: 403 }
      );
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Fetch posts
    const posts = await prisma.discussionPost.findMany({
      where: {
        groupId,
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
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    console.error("Fetch posts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const { id: groupId } = await params;

    // Verify user is a member of the group
    const isMember = await verifyGroupMembership(groupId, session.user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: "You must be a member of this group to create posts" },
        { status: 403 }
      );
    }

    // Verify group exists and is active
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, isActive: true },
    });

    if (!group || !group.isActive) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = createPostSchema.safeParse(body);

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

    const { title, content } = validationResult.data;

    // Create post
    const post = await prisma.discussionPost.create({
      data: {
        groupId,
        userId: session.user.id,
        title: title.trim(),
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
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

