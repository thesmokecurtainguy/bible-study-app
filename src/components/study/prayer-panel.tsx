"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddPrayerModal } from "@/components/prayers/add-prayer-modal";
import { AnswerPrayerModal } from "@/components/prayers/answer-prayer-modal";
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

interface PrayerPanelProps {
  prayers: Prayer[];
  isLoading: boolean;
  activeFilter: "all" | "active" | "answered";
  onFilterChange: (filter: "all" | "active" | "answered") => void;
  onRefresh: () => void;
  studyId: string;
  groupId?: string;
  currentUserId: string;
}

export function PrayerPanel({
  prayers,
  isLoading,
  activeFilter,
  onFilterChange,
  onRefresh,
  studyId,
  groupId,
  currentUserId,
}: PrayerPanelProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [answerPrayerId, setAnswerPrayerId] = useState<string | null>(null);

  const filteredPrayers =
    activeFilter === "all"
      ? prayers
      : activeFilter === "active"
      ? prayers.filter((p) => !p.isAnswered)
      : prayers.filter((p) => p.isAnswered);

  const activeCount = prayers.filter((p) => !p.isAnswered).length;
  const answeredCount = prayers.filter((p) => p.isAnswered).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const stripHtml = (html: string) => {
    if (typeof window === "undefined") {
      // Server-side: simple regex strip
      return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    }
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Prayer Requests</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Prayer
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pt-4 border-b border-gray-200">
          <Tabs value={activeFilter} onValueChange={(v) => onFilterChange(v as typeof activeFilter)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All ({prayers.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="flex-1">
                Active ({activeCount})
              </TabsTrigger>
              <TabsTrigger value="answered" className="flex-1">
                Answered ({answeredCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Prayer List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredPrayers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🙏</div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                {activeFilter === "answered"
                  ? "Keep praying!"
                  : activeFilter === "active"
                  ? "All prayers answered!"
                  : "No prayers yet"}
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                {activeFilter === "answered"
                  ? "God hears every prayer. Keep trusting and praying."
                  : activeFilter === "active"
                  ? "What a testimony! God has been faithful."
                  : "Start capturing your prayers as you study."}
              </p>
              {activeFilter !== "answered" && (
                <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                  Add Your First Prayer
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPrayers.slice(0, 10).map((prayer) => (
                <div
                  key={prayer.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    prayer.isAnswered
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
                      {prayer.title}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      {prayer.groupId ? (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                          {prayer.group?.name || "Group"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                          Private
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {stripHtml(prayer.content)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatDate(prayer.createdAt)}</span>
                    {!prayer.isAnswered && prayer.user.id === currentUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setAnswerPrayerId(prayer.id)}
                      >
                        Mark Answered
                      </Button>
                    )}
                    {prayer.isAnswered && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                        ✓ Answered
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {filteredPrayers.length > 10 && (
                <Link
                  href="/prayers"
                  className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2 border-t border-gray-200"
                >
                  View All ({filteredPrayers.length}) →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <AddPrayerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        studyId={studyId}
        groupId={groupId}
        onSuccess={() => {
          setIsAddModalOpen(false);
          onRefresh();
        }}
      />

      {answerPrayerId && (
        <AnswerPrayerModal
          isOpen={!!answerPrayerId}
          onClose={() => setAnswerPrayerId(null)}
          prayerId={answerPrayerId}
          onSuccess={() => {
            setAnswerPrayerId(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

