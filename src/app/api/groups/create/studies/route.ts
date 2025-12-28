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

    // Get user's purchased studies
    const purchases = await prisma.purchase.findMany({
      where: {
        userId: session.user.id,
        status: "completed",
      },
      include: {
        study: {
          select: {
            id: true,
            title: true,
            isPublished: true,
          },
        },
      },
    });

    // Filter to only published studies in JavaScript
    const studies = purchases
      .filter((p) => p.study && p.study.isPublished)
      .map((p) => ({
        id: p.study.id,
        title: p.study.title,
      }));

    return NextResponse.json({ studies }, { status: 200 });
  } catch (error) {
    console.error("Fetch purchased studies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

