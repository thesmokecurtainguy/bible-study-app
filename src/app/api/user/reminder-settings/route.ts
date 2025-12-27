import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reminderSettingsSchema = z.object({
  emailRemindersEnabled: z.boolean(),
  reminderTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Time must be in HH:MM format (24-hour)",
  }).optional(),
  reminderTimezone: z.string().optional(),
});

// Valid timezones (common US timezones + UTC)
const validTimezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        emailRemindersEnabled: true,
        reminderTime: true,
        reminderTimezone: true,
        lastReminderSentAt: true,
      },
    });

    if (!profile) {
      // Create profile if it doesn't exist
      const newProfile = await prisma.profile.create({
        data: {
          userId: session.user.id,
          emailRemindersEnabled: false,
          reminderTimezone: "America/New_York",
        },
        select: {
          emailRemindersEnabled: true,
          reminderTime: true,
          reminderTimezone: true,
          lastReminderSentAt: true,
        },
      });
      return NextResponse.json(newProfile);
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching reminder settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = reminderSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { emailRemindersEnabled, reminderTime, reminderTimezone } = validationResult.data;

    // Validate timezone if provided
    if (reminderTimezone && !validTimezones.includes(reminderTimezone)) {
      return NextResponse.json(
        { error: "Invalid timezone" },
        { status: 400 }
      );
    }

    // If reminders are enabled, require reminderTime
    if (emailRemindersEnabled && !reminderTime) {
      return NextResponse.json(
        { error: "Reminder time is required when reminders are enabled" },
        { status: 400 }
      );
    }

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        emailRemindersEnabled,
        reminderTime: emailRemindersEnabled ? reminderTime : null,
        reminderTimezone: reminderTimezone || "America/New_York",
      },
      create: {
        userId: session.user.id,
        emailRemindersEnabled,
        reminderTime: emailRemindersEnabled ? reminderTime : null,
        reminderTimezone: reminderTimezone || "America/New_York",
      },
      select: {
        emailRemindersEnabled: true,
        reminderTime: true,
        reminderTimezone: true,
        lastReminderSentAt: true,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating reminder settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

