import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import StudyEditor from "@/components/admin/study-editor";

interface AdminStudyEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminStudyEditPage({ params }: AdminStudyEditPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch study with all nested data
  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: {
              questions: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!study) {
    notFound();
  }

  // Serialize the study data for the client component
  const serializedStudy = {
    id: study.id,
    title: study.title,
    description: study.description || "",
    author: study.author || "",
    coverImage: study.coverImage || "",
    price: study.price ? Number(study.price) / 100 : 0,
    isPublished: study.isPublished,
    isPremium: study.isPremium,
    weeks: study.weeks.map((week) => ({
      id: week.id,
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description || "",
      days: week.days.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        title: day.title,
        content: day.content || "",
        scripture: day.scripture || "",
        questions: day.questions.map((question) => ({
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          order: question.order,
        })),
      })),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/studies">
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Study</h1>
            <p className="text-gray-600">{study.title}</p>
          </div>
        </div>
      </div>

      <StudyEditor study={serializedStudy} />
    </div>
  );
}

