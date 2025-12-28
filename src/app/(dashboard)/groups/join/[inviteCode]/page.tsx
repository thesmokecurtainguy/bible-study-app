"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface GroupInfo {
  id: string;
  name: string;
  studyTitle: string;
  inviteCode: string;
}

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const inviteCode = params.inviteCode as string;
  
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchGroupInfo() {
      try {
        const res = await fetch(`/api/groups/by-invite/${inviteCode}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Group not found. The invite code may be invalid.");
          setIsLoading(false);
          return;
        }
        
        const data = await res.json();
        setGroupInfo({
          id: data.group.id,
          name: data.group.name,
          studyTitle: data.group.studyTitle,
          inviteCode: inviteCode,
        });
        setHasPurchased(data.group.hasPurchased || false);
      } catch (err: any) {
        setError(err.message || "Failed to load group information");
      } finally {
        setIsLoading(false);
      }
    }
    fetchGroupInfo();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!groupInfo) return;

    setIsJoining(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupInfo.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteCode: inviteCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join group");
      }

      // Redirect to the group page
      router.push(`/groups/${groupInfo.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to join group");
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !groupInfo) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">{error}</p>
            <Link href="/groups">
              <Button>Back to Groups</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!groupInfo) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Join Study Group</CardTitle>
          <CardDescription>
            You've been invited to join a study group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">{groupInfo.name}</h2>
            <p className="text-gray-600">Study: {groupInfo.studyTitle}</p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {hasPurchased === false ? (
            <div className="rounded-md bg-yellow-50 p-4 space-y-3">
              <p className="text-sm text-yellow-800">
                You need to purchase this study before joining the group.
              </p>
              <Link href={`/studies`}>
                <Button>Browse Studies</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                Click the button below to join this group and start discussing with other members.
              </p>
              <Button onClick={handleJoin} disabled={isJoining} className="w-full">
                {isJoining ? "Joining..." : "Join Group"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

