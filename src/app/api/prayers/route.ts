import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPrayerSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  content: z.string().min(1, "Content is required"),
  groupId: z.string().optional().nullable(),
  studyId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, active, answered
    const groupId = searchParams.get("groupId") || null;

    const userId = session.user.id;

    // Build where clause
    const where: any = {
      OR: [
        // User's private prayers (groupId is null AND userId matches)
        {
          userId,
          groupId: null,
        },
        // Group prayers where user is a member
        groupId
          ? {
              groupId,
              group: {
                memberships: {
                  some: {
                    userId,
                    leftAt: null, // Active membership
                  },
                },
              },
            }
          : {
              groupId: { not: null },
              group: {
                memberships: {
                  some: {
                    userId,
                    leftAt: null,
                  },
                },
              },
            },
      ],
    };

    // Apply filter
    if (filter === "active") {
      where.isAnswered = false;
    } else if (filter === "answered") {
      where.isAnswered = true;
    }

    // If groupId is specified, only return prayers for that group
    if (groupId) {
      where.OR = [
        {
          userId,
          groupId: null,
        },
        {
          groupId,
          group: {
            memberships: {
              some: {
                userId,
                leftAt: null,
              },
            },
          },
        },
      ];
    }

    // CRITICAL: Never return private prayers from other users, even for admins
    // This is enforced by ensuring userId matches for private prayers
    const prayers = await prisma.prayerRequest.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ prayers }, { status: 200 });
  } catch (error) {
    console.error("Prayers fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const validationResult = createPrayerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, content, groupId, studyId } = validationResult.data;

    // If groupId is provided, verify user is a member of that group
    if (groupId) {
      const membership = await prisma.groupMembership.findFirst({
        where: {
          groupId,
          userId: session.user.id,
          leftAt: null, // Active membership
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this group" },
          { status: 403 }
        );
      }
    }

    // If studyId is provided, verify it exists (optional check)
    if (studyId) {
      const study = await prisma.study.findUnique({
        where: { id: studyId },
      });

      if (!study) {
        return NextResponse.json(
          { error: "Study not found" },
          { status: 404 }
        );
      }
    }

    const prayer = await prisma.prayerRequest.create({
      data: {
        userId: session.user.id,
        title,
        content,
        groupId: groupId || null,
        studyId: studyId || null,
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

    return NextResponse.json({ prayer }, { status: 201 });
  } catch (error) {
    console.error("Prayer creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

