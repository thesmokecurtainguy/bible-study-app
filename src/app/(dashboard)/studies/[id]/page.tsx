import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PurchaseButton from "@/components/purchase-button";

interface StudyDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StudyDetailPage({ params }: StudyDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get study details
  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      weeks: {
        orderBy: {
          weekNumber: "asc",
        },
        select: {
          id: true,
          weekNumber: true,
          title: true,
          description: true,
        },
      },
    },
  });

  if (!study || !study.isPublished) {
    notFound();
  }

  // Check if user owns this study
  const purchase = await prisma.purchase.findFirst({
    where: {
      userId: session.user.id,
      studyId: study.id,
      status: "completed",
    },
  });

  const isOwned = !!purchase;
  // Price is stored in cents, convert to dollars for display
  const priceInCents = study.price ? Number(study.price) : 0;
  const priceInDollars = priceInCents / 100;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/studies"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          ← Back to Studies
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {study.coverImage && (
            <div className="mb-6 h-64 w-full overflow-hidden rounded-lg">
              <img
                src={study.coverImage}
                alt={study.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{study.title}</CardTitle>
                  {study.author && (
                    <p className="mt-1 text-sm text-gray-500">
                      By {study.author}
                    </p>
                  )}
                </div>
                {study.isPremium && (
                  <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                    Premium
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="whitespace-pre-wrap text-base">
                {study.description || "No description available."}
              </CardDescription>

              {study.weeks.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-4 text-lg font-semibold">Study Structure</h3>
                  <div className="space-y-3">
                    {study.weeks.map((week) => (
                      <div
                        key={week.id}
                        className="rounded-lg border border-gray-200 p-4"
                      >
                        <h4 className="font-medium">
                          Week {week.weekNumber}: {week.title}
                        </h4>
                        {week.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {week.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Purchase Study</CardTitle>
              <CardDescription>
                {isOwned
                  ? "You already own this study"
                  : priceInDollars > 0
                  ? `Get lifetime access to this study`
                  : "This study is free"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {priceInDollars > 0 ? `$${priceInDollars.toFixed(2)}` : "Free"}
                </div>
                {priceInDollars > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    One-time payment
                  </p>
                )}
              </div>

              {isOwned ? (
                <Link href={`/dashboard/studies/${study.id}/start`} className="block">
                  <Button className="w-full" size="lg">
                    Continue Study
                  </Button>
                </Link>
              ) : (
                <PurchaseButton studyId={study.id} price={priceInDollars} />
              )}

              {priceInDollars > 0 && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg
                        className="mr-2 h-5 w-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Lifetime access
                    </li>
                    <li className="flex items-start">
                      <svg
                        className="mr-2 h-5 w-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      All study materials included
                    </li>
                    <li className="flex items-start">
                      <svg
                        className="mr-2 h-5 w-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Secure payment via Stripe
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

