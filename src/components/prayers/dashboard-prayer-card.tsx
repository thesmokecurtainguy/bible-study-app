"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnswerPrayerModal } from "./answer-prayer-modal";
import Link from "next/link";

interface Prayer {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  answeredAt: string | null;
  createdAt: string;
  groupId: string | null;
  group: { id: string; name: string } | null;
  study: { id: string; title: string } | null;
  user: { id: string; name: string | null };
}

interface DashboardPrayerCardProps {
  prayer: Prayer;
  currentUserId: string;
}

export function DashboardPrayerCard({
  prayer,
  currentUserId,
}: DashboardPrayerCardProps) {
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const stripHtml = (html: string) => {
    if (typeof window === "undefined") {
      return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    }
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleMarkAnswered = async () => {
    setIsMarking(true);
    try {
      const response = await fetch(`/api/prayers/${prayer.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answeredNote: null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark prayer as answered");
      }

      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error("Error marking prayer as answered:", error);
      alert("Failed to mark prayer as answered");
    } finally {
      setIsMarking(false);
    }
  };

  const isOwner = prayer.user.id === currentUserId;
  const contentPreview = stripHtml(prayer.content).substring(0, 100);

  return (
    <>
      <div className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/prayers"
                className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1 flex-1"
              >
                {prayer.title}
              </Link>
              {prayer.groupId ? (
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 shrink-0">
                  {prayer.group?.name || "Group"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-gray-300 text-gray-600 shrink-0">
                  Private
                </Badge>
              )}
            </div>
            {contentPreview && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {contentPreview}
                {stripHtml(prayer.content).length > 100 && "..."}
              </p>
            )}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{formatDate(prayer.createdAt)}</span>
                {prayer.study && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[150px]">{prayer.study.title}</span>
                  </>
                )}
              </div>
              {isOwner && !prayer.isAnswered && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAnswerModalOpen(true)}
                  disabled={isMarking}
                  className="h-7 text-xs"
                >
                  {isMarking ? "Marking..." : "Mark Answered"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnswerPrayerModal
        isOpen={isAnswerModalOpen}
        onClose={() => setIsAnswerModalOpen(false)}
        prayerId={prayer.id}
        onSuccess={() => {
          setIsAnswerModalOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}

