import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PrayerList } from "@/components/prayers/prayer-list";
import { AddPrayerButton } from "@/components/prayers/add-prayer-button";

export default async function PrayersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch user's prayers (private + shared)
  const prayersData = await prisma.prayerRequest.findMany({
    where: {
      OR: [
        // User's private prayers
        {
          userId,
          groupId: null,
        },
        // Group prayers where user is a member
        {
          groupId: { not: null },
          group: {
            memberships: {
              some: {
                userId,
                leftAt: null, // Active membership
              },
            },
          },
        },
      ],
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
    orderBy: {
      createdAt: "desc",
    },
  });

  // Serialize dates to strings for client component
  const prayers = prayersData.map((prayer) => ({
    ...prayer,
    createdAt: prayer.createdAt.toISOString(),
    answeredAt: prayer.answeredAt ? prayer.answeredAt.toISOString() : null,
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prayer Requests</h1>
            <p className="text-gray-600 mt-2">
              Capture and track your prayers as you study God's word
            </p>
          </div>
          <AddPrayerButton />
        </div>
      </div>

      <PrayerList initialPrayers={prayers} currentUserId={userId} />
    </div>
  );
}

