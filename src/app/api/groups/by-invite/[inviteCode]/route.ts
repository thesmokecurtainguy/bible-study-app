import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { inviteCode } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find group by invite code
    const group = await prisma.group.findUnique({
      where: {
        inviteCode: inviteCode,
        isActive: true,
      },
      include: {
        study: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
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

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        studyId: group.studyId,
        studyTitle: group.study.title,
        inviteCode: group.inviteCode,
        inviteEnabled: group.inviteEnabled,
        hasPurchased: !!purchase,
      },
    });
  } catch (error) {
    console.error("Find group by invite code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

