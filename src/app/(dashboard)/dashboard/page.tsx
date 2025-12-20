import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  const userName = session.user.name || session.user.email?.split("@")[0] || "there";

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
          author: true,
          coverImage: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 6, // Limit to 6 most recent purchases for dashboard
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Continue your Bible study journey and grow in faith.
        </p>
      </div>

      {/* My Studies Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">My Studies</h2>
          <Link
            href="/studies"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View all
          </Link>
        </div>
        {purchases.length === 0 ? (
          <div className="mt-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              You haven&apos;t purchased any studies yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Browse our collection of Bible studies to get started.
            </p>
            <div className="mt-6">
              <Link href="/studies">
                <Button>Browse Studies</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  {purchase.study.coverImage && (
                    <div className="mb-3 h-32 w-full overflow-hidden rounded-md">
                      <img
                        src={purchase.study.coverImage}
                        alt={purchase.study.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {purchase.study.title}
                  </h3>
                  {purchase.study.author && (
                    <p className="mt-1 text-sm text-gray-500">
                      By {purchase.study.author}
                    </p>
                  )}
                  <div className="mt-4">
                    <Link href={`/studies/${purchase.study.id}`}>
                      <Button className="w-full" variant="outline">
                        Continue Study
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prayer Requests Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Prayer Requests
          </h2>
          <Link
            href="/dashboard/prayer-requests"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View all
          </Link>
        </div>
        <div className="mt-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            No prayer requests yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Share your prayer requests with the community or keep them private.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/prayer-requests/new"
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Prayer Request
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

