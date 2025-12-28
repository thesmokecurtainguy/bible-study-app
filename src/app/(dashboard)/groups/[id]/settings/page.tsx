"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShareInviteButton } from "@/components/groups/share-invite-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Group {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  inviteEnabled: boolean;
  studyTitle: string;
  members: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userImage: string | null;
    role: string;
    joinedAt: string;
  }>;
  isOwner: boolean;
}

export default function GroupSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    inviteEnabled: true,
  });

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch group");
        }
        const data = await res.json();
        setGroup(data.group);
        setFormData({
          name: data.group.name,
          description: data.group.description || "",
          inviteEnabled: data.group.inviteEnabled,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load group");
      } finally {
        setIsLoading(false);
      }
    }
    fetchGroup();
  }, [groupId]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update group");
      }

      const data = await res.json();
      setGroup(data.group);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete group");
      }

      router.push("/groups");
    } catch (err: any) {
      setError(err.message || "Failed to delete group");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      // Refresh group data
      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (groupRes.ok) {
        const data = await groupRes.json();
        setGroup(data.group);
      }
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Group not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group.isOwner) {
    router.push(`/groups/${groupId}`);
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Group Settings</h1>
        <p className="mt-2 text-gray-600">{group.studyTitle}</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Group Details */}
      <Card>
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
          <CardDescription>Update your group's name and description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
              rows={4}
            />
            <p className="text-sm text-gray-500">
              {formData.description.length}/500 characters
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Invite Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Settings</CardTitle>
          <CardDescription>Manage how others can join your group.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="inviteEnabled">Enable Invites</Label>
              <p className="text-sm text-gray-500">
                Allow new members to join using the invite code
              </p>
            </div>
            <Switch
              id="inviteEnabled"
              checked={formData.inviteEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, inviteEnabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Invite Code</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-gray-900 font-mono text-sm">
                {group.inviteCode}
              </code>
              <ShareInviteButton inviteCode={group.inviteCode} />
            </div>
            <p className="text-sm text-gray-500">
              Share this code or the invite link with others who have purchased the study.
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving} variant="outline">
            {isSaving ? "Saving..." : "Save Invite Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Members Management */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Manage group members. You cannot remove yourself.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    {member.userImage ? (
                      <img
                        src={member.userImage}
                        alt={member.userName}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium text-blue-700">
                        {member.userName[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.userName}</p>
                    <p className="text-sm text-gray-500">{member.userEmail}</p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {member.userId !== group.ownerId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {member.userName} from this group?
                          They will need to use the invite code to rejoin.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.userId)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this group. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Group</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this group? All members will lose access
                  and all discussions will be archived. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Group
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

