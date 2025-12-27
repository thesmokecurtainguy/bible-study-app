"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { AnswerPrayerModal } from "./answer-prayer-modal";
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
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface Prayer {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  answeredAt: string | null;
  answeredNote: string | null;
  createdAt: string;
  groupId: string | null;
  group: { id: string; name: string } | null;
  study: { id: string; title: string } | null;
  user: { id: string; name: string | null };
}

interface PrayerCardProps {
  prayer: Prayer;
  isOwner: boolean;
  onUpdate: () => void;
}

export function PrayerCard({ prayer, isOwner, onUpdate }: PrayerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [title, setTitle] = useState(prayer.title);
  const [content, setContent] = useState(prayer.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false);

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/prayers/${prayer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update prayer");
      }

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating prayer:", error);
      alert(error instanceof Error ? error.message : "Failed to update prayer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/prayers/${prayer.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete prayer");
      }

      onUpdate();
    } catch (error) {
      console.error("Error deleting prayer:", error);
      alert(error instanceof Error ? error.message : "Failed to delete prayer");
    } finally {
      setIsDeleting(false);
      setIsDeletingConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <Card
        className={`transition-all ${
          prayer.isAnswered
            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
            : "bg-white"
        }`}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mb-2"
                />
              ) : (
                <h3 className="text-lg font-semibold text-gray-900">{prayer.title}</h3>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {prayer.isAnswered && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <svg
                      className="w-3 h-3 mr-1"
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
                    Answered
                  </Badge>
                )}
                {prayer.groupId ? (
                  <Badge variant="outline" className="border-blue-300 text-blue-700">
                    {prayer.group?.name || "Group"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-gray-300 text-gray-600">
                    Private
                  </Badge>
                )}
                {prayer.study && (
                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                    {prayer.study.title}
                  </Badge>
                )}
                <span className="text-xs text-gray-500">
                  {formatDate(prayer.createdAt)}
                </span>
                {prayer.isAnswered && prayer.answeredAt && (
                  <span className="text-xs text-green-600 font-medium">
                    Answered on {formatDate(prayer.answeredAt)}
                  </span>
                )}
              </div>
            </div>
            {isOwner && !isEditing && (
              <div className="flex items-center gap-2">
                {!prayer.isAnswered && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAnswerModal(true)}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    Mark Answered
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsDeletingConfirm(true)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <RichTextEditor
                content={content}
                onChange={setContent}
                minHeight="150px"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setTitle(prayer.title);
                    setContent(prayer.content);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <RichTextDisplay content={prayer.content} />
              {prayer.isAnswered && prayer.answeredNote && (
                <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-2">
                    How God answered:
                  </p>
                  <RichTextDisplay
                    content={prayer.answeredNote}
                    className="text-green-800 prose-p:text-green-800"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AnswerPrayerModal
        isOpen={showAnswerModal}
        onClose={() => setShowAnswerModal(false)}
        prayerId={prayer.id}
        onSuccess={onUpdate}
      />

      <AlertDialog open={isDeletingConfirm} onOpenChange={setIsDeletingConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete prayer request?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This prayer request will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

