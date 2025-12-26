import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminStudyActions from "./admin-study-actions";

export default async function AdminStudiesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch all studies with counts
  const studies = await prisma.study.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      weeks: {
        select: { id: true },
      },
      _count: {
        select: {
          purchases: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Studies</h1>
          <p className="text-gray-600">Create, edit, and publish Bible studies</p>
        </div>
        <Link href="/admin/upload">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload New Study
          </Button>
        </Link>
      </div>

      {studies.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No studies yet</h3>
            <p className="text-gray-500 mb-4">Upload your first Bible study to get started.</p>
            <Link href="/admin/upload">
              <Button>Upload Study</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {studies.map((study) => {
            const priceInDollars = study.price ? Number(study.price) / 100 : 0;
            
            return (
              <Card key={study.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {study.title}
                        </h3>
                        {study.isPublished ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            Draft
                          </Badge>
                        )}
                        {study.isPremium && (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                            Premium
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-2">
                        {study.author ? `By ${study.author}` : "No author"} · {study.weeks.length} weeks · {study._count.purchases} purchases
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          {priceInDollars > 0 ? `$${priceInDollars.toFixed(2)}` : "Free"}
                        </span>
                        <span>·</span>
                        <span>
                          Created {new Date(study.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/admin/studies/${study.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                      </Link>
                      <AdminStudyActions study={study} />
                    </div>
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

