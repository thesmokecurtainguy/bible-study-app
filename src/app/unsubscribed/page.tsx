import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UnsubscribedPageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function UnsubscribedPage({ searchParams }: UnsubscribedPageProps) {
  const params = await searchParams;
  const success = params.success === "true";
  const error = params.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {success ? "✓ Unsubscribed Successfully" : "Unsubscribe"}
          </CardTitle>
          <CardDescription>
            {success
              ? "You've been unsubscribed from study reminders"
              : error === "invalid"
              ? "Invalid unsubscribe link. Please try again."
              : error === "server"
              ? "An error occurred. Please try again later."
              : "Processing your unsubscribe request..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success && (
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
              <p>
                You will no longer receive daily study reminder emails. You can
                re-enable reminders anytime in your{" "}
                <Link href="/settings" className="underline font-medium">
                  settings
                </Link>
                .
              </p>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
              <p>
                {error === "invalid"
                  ? "The unsubscribe link is invalid or has expired. Please try unsubscribing from your settings page."
                  : "An error occurred while processing your request. Please try again later or contact support."}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Link href="/settings">
              <Button className="w-full">Go to Settings</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

