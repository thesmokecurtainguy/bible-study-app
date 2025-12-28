import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const createGroupSchema = z.object({
  studyId: z.string().min(1, "Study ID is required"),
  name: z.string().min(1, "Group name is required").max(100, "Group name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

// Generate a unique 8-character alphanumeric invite code
async function generateInviteCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars like 0, O, I, 1
  let code: string;
  let exists = true;

  while (exists) {
    code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
    const existing = await prisma.group.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });
    exists = !!existing;
  }

  return code!;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Return groups where user is member or owner
    const memberships = await prisma.groupMembership.findMany({
      where: {
        userId: session.user.id,
        leftAt: null, // Active membership
      },
      include: {
        group: {
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
        },
      },
    });

    // Filter to only active groups
    const activeMemberships = memberships.filter((m) => m.group && m.group.isActive);

    // Also get groups where user is owner
    const ownedGroups = await prisma.group.findMany({
      where: {
        ownerId: session.user.id,
        isActive: true,
      },
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

    // Combine and deduplicate
    const groupMap = new Map();
    
    activeMemberships.forEach((m) => {
      if (m.group) {
        groupMap.set(m.group.id, {
          id: m.group.id,
          name: m.group.name,
          description: m.group.description,
          studyId: m.group.studyId,
          studyTitle: m.group.study.title,
          memberCount: m.group._count.memberships,
          isOwner: false,
          createdAt: m.group.createdAt,
        });
      }
    });

    ownedGroups.forEach((group) => {
      groupMap.set(group.id, {
        id: group.id,
        name: group.name,
        description: group.description,
        studyId: group.studyId,
        studyTitle: group.study.title,
        memberCount: group._count.memberships,
        isOwner: true,
        createdAt: group.createdAt,
      });
    });

    const groups = Array.from(groupMap.values());

    return NextResponse.json({ groups }, { status: 200 });
  } catch (error) {
    console.error("Groups fetch error:", error);
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
    const validationResult = createGroupSchema.safeParse(body);

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

    const { studyId, name, description } = validationResult.data;

    // Check if user has purchased this study
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId: session.user.id,
        studyId: studyId,
        status: "completed",
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "You must purchase this study before creating a group" },
        { status: 403 }
      );
    }

    // Check if study exists
    const study = await prisma.study.findUnique({
      where: { id: studyId },
      select: { id: true, isPublished: true },
    });

    if (!study || !study.isPublished) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    // Generate unique invite code
    const inviteCode = await generateInviteCode();

    // Create group and add creator as first member
    const group = await prisma.group.create({
      data: {
        studyId,
        name,
        description: description || null,
        ownerId: session.user.id,
        inviteCode,
        inviteEnabled: true,
        isActive: true,
        memberships: {
          create: {
            userId: session.user.id,
            role: "admin",
          },
        },
      },
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

    return NextResponse.json(
      {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          studyId: group.studyId,
          studyTitle: group.study.title,
          inviteCode: group.inviteCode,
          memberCount: group._count.memberships,
          createdAt: group.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Group creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

