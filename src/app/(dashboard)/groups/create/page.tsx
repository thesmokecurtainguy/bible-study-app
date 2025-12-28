"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Study {
  id: string;
  title: string;
}

export default function CreateGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoadingStudies, setIsLoadingStudies] = useState(true);
  const [formData, setFormData] = useState({
    studyId: searchParams.get("studyId") || "",
    name: "",
    description: "",
  });

  // Fetch purchased studies on mount
  useEffect(() => {
    async function fetchPurchasedStudies() {
      try {
        const res = await fetch("/api/groups/create/studies");
        if (res.ok) {
          const data = await res.json();
          setStudies(data.studies || []);
        }
      } catch (err) {
        console.error("Failed to fetch studies:", err);
      } finally {
        setIsLoadingStudies(false);
      }
    }
    fetchPurchasedStudies();
  }, []);

  // Update studyId if it's in the URL params
  useEffect(() => {
    const studyId = searchParams.get("studyId");
    if (studyId) {
      setFormData((prev) => ({ ...prev, studyId }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      // Redirect to the new group
      router.push(`/groups/${data.group.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create group");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Study Group</h1>
        <p className="mt-2 text-gray-600">
          Start a group for a study you've purchased and invite others to join.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
          <CardDescription>
            Fill in the information below to create your study group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="studyId">Study *</Label>
              {isLoadingStudies ? (
                <div className="flex h-10 w-full items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Loading studies...
                </div>
              ) : studies.length === 0 ? (
                <div className="space-y-2">
                  <div className="flex h-10 w-full items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    No purchased studies found
                  </div>
                  <p className="text-sm text-gray-500">
                    You need to purchase a study before creating a group for it.
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.studyId || undefined}
                  onValueChange={(value) => setFormData({ ...formData, studyId: value })}
                  required
                >
                  <SelectTrigger id="studyId">
                    <SelectValue placeholder="Select a study" />
                  </SelectTrigger>
                  <SelectContent>
                    {studies.map((study) => (
                      <SelectItem key={study.id} value={study.id}>
                        {study.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John 4:1-15 Study Group"
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell others what this group is about..."
                maxLength={500}
                rows={4}
              />
              <p className="text-sm text-gray-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !formData.studyId || !formData.name || studies.length === 0}
              >
                {isLoading ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

