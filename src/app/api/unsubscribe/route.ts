import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");

    if (!token || !userId) {
      return NextResponse.redirect(
        new URL("/unsubscribed?error=invalid", request.url)
      );
    }

    // Verify the token
    const secret = process.env.NEXTAUTH_SECRET || "fallback-secret";
    const expectedToken = crypto
      .createHash("sha256")
      .update(`${userId}:${secret}`)
      .digest("hex");

    if (token !== expectedToken) {
      return NextResponse.redirect(
        new URL("/unsubscribed?error=invalid", request.url)
      );
    }

    // Disable email reminders for this user
    await prisma.profile.updateMany({
      where: { userId },
      data: { emailRemindersEnabled: false },
    });

    // Redirect to unsubscribed page
    return NextResponse.redirect(new URL("/unsubscribed?success=true", request.url));
  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    return NextResponse.redirect(
      new URL("/unsubscribed?error=server", request.url)
    );
  }
}

