"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Group {
  id: string;
  name: string;
}

interface AddPrayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studyId?: string;
  groupId?: string;
  onSuccess: () => void;
}

export function AddPrayerModal({
  isOpen,
  onClose,
  studyId,
  groupId: initialGroupId,
  onSuccess,
}: AddPrayerModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);

  // Fetch user's groups
  useEffect(() => {
    if (isOpen) {
      fetch("/api/groups?membership=true")
        .then((res) => res.json())
        .then((data) => {
          if (data.groups) {
            setGroups(data.groups);
          }
        })
        .catch(() => {
          // If groups API doesn't exist, that's okay - we'll just show private option
        });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/prayers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          groupId: isSharing && selectedGroupId ? selectedGroupId : null,
          studyId: studyId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create prayer request");
      }

      // Reset form
      setTitle("");
      setContent("");
      setIsSharing(false);
      setSelectedGroupId(initialGroupId || null);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating prayer:", error);
      alert(error instanceof Error ? error.message : "Failed to create prayer request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareToggle = (checked: boolean) => {
    if (checked && groups.length > 0) {
      // Show confirmation dialog
      setPendingGroupId(selectedGroupId || groups[0]?.id || null);
      setShowConfirmation(true);
    } else {
      setIsSharing(false);
      setSelectedGroupId(null);
    }
  };

  const confirmSharing = () => {
    setIsSharing(true);
    setSelectedGroupId(pendingGroupId);
    setShowConfirmation(false);
  };

  const cancelSharing = () => {
    setShowConfirmation(false);
    setPendingGroupId(null);
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Prayer Request</DialogTitle>
            <DialogDescription>
              Capture your prayer request as you study. Keep it private or share with your study group.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title for your prayer request"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Prayer Request</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Share your prayer request..."
                minHeight="150px"
              />
            </div>

            {groups.length > 0 && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share-toggle" className="text-base font-medium">
                      Share with study group
                    </Label>
                    <p className="text-sm text-gray-500">
                      Allow group members to see and pray for this request
                    </p>
                  </div>
                  <Switch
                    id="share-toggle"
                    checked={isSharing}
                    onCheckedChange={handleShareToggle}
                  />
                </div>

                {isSharing && selectedGroup && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-900">
                      <strong>Sharing with:</strong> {selectedGroup.name}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Group members will be able to see your name and pray for you.
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !title.trim() || !content.trim()}>
                {isLoading ? "Adding..." : "Add Prayer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share with your study group?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedGroup && (
                <>
                  This prayer request will be visible to all members of{" "}
                  <strong>{selectedGroup.name}</strong>. They will be able to see your name and
                  pray for you. Private details should only be shared with people you trust.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSharing}>Keep Private</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSharing}>Share with Group</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

