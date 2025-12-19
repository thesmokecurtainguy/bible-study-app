"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserData {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name || "",
    },
  });

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      // Wait for session to be loaded
      if (status === "loading") {
        return;
      }

      // If not authenticated, let the layout handle redirect
      if (status === "unauthenticated" || !session) {
        setIsLoadingData(false);
        return;
      }

      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setUserData(data.user);
          reset({ name: data.user.name || "" });
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchUserData();
  }, [session, status, reset]);

  // Show loading state while checking session or loading data
  if (status === "loading" || isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, the layout will handle redirect
  // Just return null to avoid rendering before redirect
  if (status === "unauthenticated" || !session) {
    return null;
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details && Array.isArray(result.details)) {
          const errorMessage = result.details
            .map((detail: { message: string }) => detail.message)
            .join(", ");
          setError(errorMessage);
        } else {
          setError(result.error || "Failed to update profile");
        }
        setIsLoading(false);
        return;
      }

      // Update session with new name
      await update();
      setSuccessMessage("Profile updated successfully!");
      setIsLoading(false);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const memberSince = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">
          Manage your profile information and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your profile information. Your email cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {successMessage && (
              <div
                className="rounded-md bg-green-50 p-4 text-sm text-green-800"
                role="alert"
              >
                {successMessage}
              </div>
            )}
            {error && (
              <div
                className="rounded-md bg-red-50 p-4 text-sm text-red-800"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Display Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                error={errors.name?.message}
                {...register("name")}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={session.user?.email || ""}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                Your email address cannot be changed.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Member Since</label>
              <div className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {memberSince}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

