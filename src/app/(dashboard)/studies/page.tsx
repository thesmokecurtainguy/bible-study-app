import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StudiesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  // Get all published studies
  const studies = await prisma.study.findMany({
    where: {
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      price: true,
      isPremium: true,
      author: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get user's purchases to check ownership
  const userPurchases = await prisma.purchase.findMany({
    where: {
      userId: session.user.id,
      status: "completed",
    },
    select: {
      studyId: true,
    },
  });

  const ownedStudyIds = new Set(userPurchases.map((p) => p.studyId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Studies</h1>
        <p className="mt-2 text-gray-600">
          Explore our collection of Bible studies to deepen your faith.
        </p>
      </div>

      {studies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No studies available at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studies.map((study) => {
            const isOwned = ownedStudyIds.has(study.id);
            // Price is stored in cents, convert to dollars
            const priceInCents = study.price ? Number(study.price) : 0;
            const priceInDollars = priceInCents / 100;

            return (
              <Card key={study.id} className="flex flex-col">
                {study.coverImage && (
                  <div className="h-48 w-full overflow-hidden rounded-t-lg">
                    <img
                      src={study.coverImage}
                      alt={study.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2">{study.title}</CardTitle>
                    {study.isPremium && (
                      <span className="ml-2 rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                        Premium
                      </span>
                    )}
                  </div>
                  {study.author && (
                    <p className="text-sm text-gray-500">By {study.author}</p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <CardDescription className="line-clamp-3 mb-4 flex-1">
                    {study.description || "No description available."}
                  </CardDescription>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900">
                      {priceInDollars > 0 ? `$${priceInDollars.toFixed(2)}` : "Free"}
                    </div>
                    <Link href={`/studies/${study.id}`}>
                      <Button variant={isOwned ? "default" : "outline"}>
                        {isOwned ? "View Study" : "View Details"}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

