import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const membership = searchParams.get("membership") === "true";

    if (membership) {
      // Return groups where user is a member
      const memberships = await prisma.groupMembership.findMany({
        where: {
          userId: session.user.id,
          leftAt: null, // Active membership
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      const groups = memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description,
      }));

      return NextResponse.json({ groups }, { status: 200 });
    }

    // Return all public groups (for future use)
    const groups = await prisma.group.findMany({
      where: {
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return NextResponse.json({ groups }, { status: 200 });
  } catch (error) {
    console.error("Groups fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

